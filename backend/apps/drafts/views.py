from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.drafts.models import DraftTemplate
from apps.drafts.serializers import DraftTemplateSerializer, DraftGenerateSerializer, DraftSaveSerializer
from apps.matters.models import Matter
from services.drafting import DraftingService, default_template_variables
from services.audit_service import log_audit


class DraftTemplateListView(generics.ListAPIView):
    serializer_class = DraftTemplateSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = DraftTemplate.objects.filter(organization=self.request.user.organization, is_active=True)
        t = self.request.query_params.get('template_type')
        if t:
            qs = qs.filter(template_type=t)
        return qs.order_by('template_type', 'title')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        if not qs.exists():
            defaults = []
            for t, _ in DraftTemplate.TEMPLATE_CHOICES:
                defaults.append({
                    "id": None,
                    "template_type": t,
                    "title": t.replace('_', ' ').upper(),
                    "description": "Built-in template metadata (no file).",
                    "storage_path": "",
                    "variables": default_template_variables(t),
                    "is_active": True,
                })
            return Response(defaults)
        return super().list(request, *args, **kwargs)


class DraftGenerateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = DraftGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matter = Matter.objects.get(id=serializer.validated_data['matter_id'], organization=request.user.organization)
        template_type = serializer.validated_data['template_type']
        template_id = serializer.validated_data.get('template_id')
        inputs = serializer.validated_data['inputs']
        apply_preferred = serializer.validated_data.get('apply_preferred_clauses', True)

        template = None
        if template_id:
            template = DraftTemplate.objects.get(id=template_id, organization=request.user.organization)

        service = DraftingService(org_id=str(request.user.organization_id))
        result = service.generate(template_type=template_type, template=template, inputs=inputs, apply_preferred_clauses=apply_preferred)

        title = serializer.validated_data.get('title') or f"{template_type.replace('_',' ').title()} - Draft"

        return Response({
            "generated_title": title,
            "draft_content": result['draft_content'],
            "used_clause_ids": result.get('used_clause_ids', []),
            "warnings": result.get('warnings', []),
            "save_metadata": {
                "matter_id": str(matter.id),
                "template_type": template_type,
            }
        })


class DraftSaveView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = DraftSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matter = Matter.objects.get(id=serializer.validated_data['matter_id'], organization=request.user.organization)
        service = DraftingService(org_id=str(request.user.organization_id))
        doc = service.save_to_matter(
            matter=matter,
            user=request.user,
            title=serializer.validated_data['title'],
            template_type=serializer.validated_data['template_type'],
            draft_content=serializer.validated_data['draft_content'],
            used_clause_ids=[str(x) for x in serializer.validated_data.get('used_clause_ids', [])],
        )
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='draft.saved',
            entity_type='document',
            entity_id=str(doc.id),
            metadata={'matter_id': str(matter.id), 'template_type': serializer.validated_data['template_type']},
        )
        return Response({
            "document_id": str(doc.id),
            "storage_path": doc.storage_path,
            "file_name": doc.file_name,
        }, status=status.HTTP_201_CREATED)
