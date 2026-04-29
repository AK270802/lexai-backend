from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.playbooks.models import Playbook
from apps.playbooks.serializers import PlaybookSerializer


class PlaybookListCreateView(generics.ListCreateAPIView):
    serializer_class = PlaybookSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Playbook.objects.filter(organization=self.request.user.organization).order_by('-updated_at')
        q = self.request.query_params.get('q')
        status_val = self.request.query_params.get('status')
        if status_val:
            qs = qs.filter(status=status_val)
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)


class PlaybookDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlaybookSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return Playbook.objects.filter(organization=self.request.user.organization)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        instance.delete()
