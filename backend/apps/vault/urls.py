from django.urls import path

from apps.vault.views import ClauseVaultListCreateView, ClauseVaultDetailView


urlpatterns = [
    path('clauses/', ClauseVaultListCreateView.as_view(), name='vault_clauses'),
    path('clauses/<uuid:id>/', ClauseVaultDetailView.as_view(), name='vault_clause_detail'),
]

