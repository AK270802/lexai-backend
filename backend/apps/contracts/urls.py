from django.urls import path

from apps.contracts.views import (
    ContractDetailView,
    ContractClausesView,
    ContractRedlineCreateView,
    ContractRedlineAcceptView,
    ContractRedlineRejectView,
    ContractMissingClausesView,
)


urlpatterns = [
    path('<uuid:id>/', ContractDetailView.as_view(), name='contract_detail'),
    path('<uuid:id>/clauses/', ContractClausesView.as_view(), name='contract_clauses'),
    path('<uuid:id>/missing-clauses/', ContractMissingClausesView.as_view(), name='contract_missing_clauses'),
    path('<uuid:id>/redlines/', ContractRedlineCreateView.as_view(), name='contract_redline_create'),
    path('<uuid:id>/redlines/<uuid:redline_id>/accept/', ContractRedlineAcceptView.as_view(), name='contract_redline_accept'),
    path('<uuid:id>/redlines/<uuid:redline_id>/reject/', ContractRedlineRejectView.as_view(), name='contract_redline_reject'),
]

