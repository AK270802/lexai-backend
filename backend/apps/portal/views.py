from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contracts.models import ContractClause
from apps.documents.models import Document
from apps.matters.models import Matter
from apps.portal.models import PortalAction
from apps.portal.serializers import PortalActionSerializer, PortalTokenCreateSerializer
from services.portal_tokens import create_portal_token, validate_portal_token
from services.storage import StorageService
from services.notifications_service import create_notification
from services.audit_service import log_audit


class PortalTokenCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        serializer = PortalTokenCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matter = Matter.objects.get(id=serializer.validated_data['matter_id'], organization=request.user.organization)
        doc = None
        if serializer.validated_data.get('document_id'):
            doc = Document.objects.get(id=serializer.validated_data['document_id'], organization=request.user.organization)
            if doc.matter_id != matter.id:
                raise PermissionDenied('Document not in matter')

        token_obj, raw = create_portal_token(
            organization=request.user.organization,
            matter=matter,
            document=doc,
            created_by=request.user,
            ttl_hours=serializer.validated_data.get('ttl_hours', 24),
            single_use=serializer.validated_data.get('single_use', False),
            permissions=serializer.validated_data.get('permissions'),
        )
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='portal.token.created',
            entity_type='portal_token',
            entity_id=str(token_obj.id),
            metadata={'matter_id': str(matter.id), 'document_id': str(doc.id) if doc else None, 'expires_at': token_obj.expires_at.isoformat()},
        )
        return Response(
            {
                "token": raw,
                "expires_at": token_obj.expires_at,
                "token_id": str(token_obj.id),
                "matter_id": str(matter.id),
                "document_id": str(doc.id) if doc else None,
            },
            status=status.HTTP_201_CREATED,
        )


class PortalTokenView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, token):
        validation = validate_portal_token(token)
        if not validation.ok:
            return Response({"error": validation.error}, status=status.HTTP_404_NOT_FOUND)
        t = validation.token
        assert t is not None

        docs_qs = Document.objects.filter(organization=t.organization, matter=t.matter).order_by('-created_at')
        if t.document_id:
            docs_qs = docs_qs.filter(id=t.document_id)

        storage = StorageService()
        documents = []
        for d in docs_qs:
            documents.append(
                {
                    "id": str(d.id),
                    "file_name": d.file_name,
                    "file_type": d.file_type,
                    "parse_status": d.parse_status,
                    "download_url": storage.generate_presigned_download_url(d.storage_path),
                    "clauses_count": ContractClause.objects.filter(document=d).count(),
                }
            )

        return Response(
            {
                "matter": {"id": str(t.matter_id), "title": t.matter.title},
                "documents": documents,
                "permissions": t.permissions or {},
                "expires_at": t.expires_at,
            }
        )


class PortalDocumentView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, token, document_id):
        validation = validate_portal_token(token)
        if not validation.ok:
            return Response({"error": validation.error}, status=status.HTTP_404_NOT_FOUND)
        t = validation.token
        assert t is not None

        doc = Document.objects.get(id=document_id, organization=t.organization)
        if doc.matter_id != t.matter_id:
            return Response({"error": "invalid"}, status=status.HTTP_404_NOT_FOUND)
        if t.document_id and str(t.document_id) != str(doc.id):
            return Response({"error": "invalid"}, status=status.HTTP_404_NOT_FOUND)

        clauses = ContractClause.objects.filter(document=doc).order_by('page_number', 'clause_type')
        clause_payload = [
            {
                "id": str(c.id),
                "clause_type": c.clause_type,
                "raw_text": c.raw_text,
                "page_number": c.page_number,
                "risk_level": c.risk_level,
                "risk_reason": c.risk_reason,
                "standard_deviation": c.standard_deviation,
                "suggested_revision": c.suggested_revision,
                "confidence_score": c.confidence_score,
                "highlights": (c.bbox_coords or {}).get("highlights", []) if isinstance(c.bbox_coords, dict) else [],
            }
            for c in clauses
        ]

        storage = StorageService()
        return Response(
            {
                "document": {
                    "id": str(doc.id),
                    "file_name": doc.file_name,
                    "file_type": doc.file_type,
                    "download_url": storage.generate_presigned_download_url(doc.storage_path),
                },
                "clauses": clause_payload,
            }
        )


class PortalActionView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, token):
        validation = validate_portal_token(token)
        if not validation.ok:
            return Response({"error": validation.error}, status=status.HTTP_404_NOT_FOUND)
        t = validation.token
        assert t is not None

        serializer = PortalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        actor_name = serializer.validated_data.get("actor_name", "")
        actor_email = serializer.validated_data.get("actor_email", "")
        metadata = serializer.validated_data.get("metadata") or {}

        act = PortalAction.objects.create(
            organization=t.organization,
            token=t,
            action=action,
            actor_name=actor_name,
            actor_email=actor_email,
            metadata=metadata,
        )
        log_audit(
            organization=t.organization,
            actor=t.created_by,
            action='portal.action',
            entity_type='portal_token',
            entity_id=str(t.id),
            metadata={'action': action, 'actor_name': actor_name, 'actor_email': actor_email, 'matter_id': str(t.matter_id)},
        )

        if t.single_use and t.used_at is None:
            t.used_at = timezone.now()
            t.save(update_fields=["used_at"])

        if t.created_by_id:
            create_notification(
                organization=t.organization,
                user=t.created_by,
                type="portal_viewed" if action == "acknowledge" else "portal_viewed",
                title=f"Client {action}",
                body=f"{actor_name or 'Client'} performed {action} on portal.",
                data={"matter_id": str(t.matter_id), "portal_token_id": str(t.id), "action_id": str(act.id)},
            )

        return Response({"ok": True})
