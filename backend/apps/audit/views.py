import csv
from datetime import datetime

from django.http import StreamingHttpResponse
from rest_framework import generics, permissions

from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = (IsAdmin,)

    def get_queryset(self):
        return build_audit_queryset(self.request)


def build_audit_queryset(request):
    qs = AuditLog.objects.filter(organization=request.user.organization).select_related('actor').order_by('-created_at')
    actor_id = request.query_params.get('actor_id')
    action = request.query_params.get('action')
    entity_type = request.query_params.get('entity_type')
    date_from = request.query_params.get('from')
    date_to = request.query_params.get('to')
    if actor_id:
        qs = qs.filter(actor_id=actor_id)
    if action:
        qs = qs.filter(action=action)
    if entity_type:
        qs = qs.filter(entity_type=entity_type)
    if date_from:
        try:
            qs = qs.filter(created_at__gte=datetime.fromisoformat(date_from))
        except Exception:
            pass
    if date_to:
        try:
            qs = qs.filter(created_at__lte=datetime.fromisoformat(date_to))
        except Exception:
            pass
    return qs


class Echo:
    def write(self, value):
        return value


class AuditLogExportView(generics.GenericAPIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        qs = build_audit_queryset(request)
        qs = qs[:5000]

        def rows():
            pseudo_buffer = Echo()
            writer = csv.writer(pseudo_buffer)
            yield writer.writerow(['timestamp', 'actor_email', 'actor_name', 'action', 'entity_type', 'entity_id', 'metadata'])
            for a in qs:
                yield writer.writerow([
                    a.created_at.isoformat(),
                    a.actor.email if a.actor else '',
                    a.actor.name if a.actor else '',
                    a.action,
                    a.entity_type,
                    a.entity_id,
                    a.metadata,
                ])

        resp = StreamingHttpResponse(rows(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename=\"audit.csv\"'
        return resp
