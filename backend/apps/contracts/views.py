from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contracts.models import ContractClause, Redline
from apps.documents.models import Document
from apps.contracts.serializers import ContractClauseSerializer, RedlineSerializer, CreateRedlineSerializer
from services.storage import StorageService
from services.audit_service import log_audit
from services.llmrouter import LLMRouter
from services.contract_intelligence import detect_missing_clauses


class ContractDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, id):
        document = get_object_or_404(Document, id=id, organization=request.user.organization)
        storage = StorageService()
        download_url = storage.generate_presigned_download_url(document.storage_path)

        return Response({
            "id": str(document.id),
            "file_name": document.file_name,
            "file_type": document.file_type,
            "parse_status": document.parse_status,
            "matter_id": str(document.matter_id) if document.matter_id else None,
            "download_url": download_url,
            "created_at": document.created_at,
        })


class ContractClausesView(generics.ListAPIView):
    serializer_class = ContractClauseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        document = get_object_or_404(Document, id=self.kwargs['id'], organization=self.request.user.organization)
        qs = ContractClause.objects.filter(document=document).order_by('page_number', 'clause_type')
        page = self.request.query_params.get('page')
        if page:
            try:
                page_int = int(page)
                qs = qs.filter(page_number=page_int)
            except ValueError:
                pass
        return qs


class ContractRedlineCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, id):
        document = get_object_or_404(Document, id=id, organization=request.user.organization)
        serializer = CreateRedlineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clause = get_object_or_404(ContractClause, id=serializer.validated_data['clause_id'], document=document)
        revised_text = serializer.validated_data.get('revised_text')
        if revised_text is None or revised_text.strip() == '':
            revised_text = clause.suggested_revision

        redline = Redline.objects.create(
            clause=clause,
            user=request.user,
            action=serializer.validated_data.get('action', 'revision'),
            original_text=clause.raw_text,
            revised_text=revised_text,
        )
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='redline.created',
            entity_type='redline',
            entity_id=str(redline.id),
            metadata={'document_id': str(document.id), 'clause_id': str(clause.id)},
        )
        return Response(RedlineSerializer(redline).data, status=status.HTTP_201_CREATED)


class _RedlineStatusUpdateBase(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    new_status: str = 'pending'

    def post(self, request, id, redline_id):
        document = get_object_or_404(Document, id=id, organization=request.user.organization)
        redline = get_object_or_404(Redline, id=redline_id, clause__document=document)
        redline.status = self.new_status
        redline.save(update_fields=['status'])
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action=f'redline.{self.new_status}',
            entity_type='redline',
            entity_id=str(redline.id),
            metadata={'document_id': str(document.id), 'clause_id': str(redline.clause_id)},
        )
        return Response(RedlineSerializer(redline).data)


class ContractRedlineAcceptView(_RedlineStatusUpdateBase):
    new_status = 'accepted'


class ContractRedlineRejectView(_RedlineStatusUpdateBase):
    new_status = 'rejected'


class ContractMissingClausesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, id):
        document = get_object_or_404(Document, id=id, organization=request.user.organization)

        if document.parse_status != 'completed':
            return Response({'missing': []})

        found_types = list(
            ContractClause.objects.filter(document=document)
            .values_list('clause_type', flat=True)
            .distinct()
        )

        meta = document.metadata or {}
        doc_type = meta.get('document_type', '') or _infer_doc_type(document.file_name)

        try:
            router = LLMRouter(organization_id=str(request.user.organization_id))
            missing = detect_missing_clauses(router, doc_type, found_types)
            return Response({'missing': missing, 'document_type': doc_type})
        except Exception as e:
            return Response({'missing': [], 'error': str(e)})


def _infer_doc_type(file_name: str) -> str:
    name = file_name.lower()
    if 'nda' in name or 'non-disclosure' in name or 'confidential' in name:
        return 'NDA'
    if 'msa' in name or 'master service' in name:
        return 'MSA'
    if 'employment' in name or 'offer letter' in name:
        return 'Employment Agreement'
    if 'service' in name:
        return 'Service Agreement'
    if 'lease' in name or 'tenancy' in name:
        return 'Lease Agreement'
    return 'agreement'
