from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from apps.vault.models import ClauseVaultEntry
from apps.vault.serializers import ClauseVaultEntrySerializer
from services.vault_vectors import upsert_clause_vault_entry


class IsVaultEditor(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'lawyer')


class ClauseVaultListCreateView(generics.ListCreateAPIView):
    serializer_class = ClauseVaultEntrySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = ClauseVaultEntry.objects.filter(organization=self.request.user.organization).order_by('-updated_at')
        q = self.request.query_params.get('q')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__iexact=category)
        if q:
            qs = qs.filter(Q(label__icontains=q) | Q(text__icontains=q) | Q(jurisdiction__icontains=q))
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        entry = serializer.save(organization=self.request.user.organization, created_by=self.request.user)
        upsert_clause_vault_entry(entry)


class ClauseVaultDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClauseVaultEntrySerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return ClauseVaultEntry.objects.filter(organization=self.request.user.organization)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        entry = serializer.save()
        upsert_clause_vault_entry(entry)

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'lawyer'):
            raise PermissionDenied('Insufficient permissions')
        instance.delete()
