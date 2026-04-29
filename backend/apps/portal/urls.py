from django.urls import path

from apps.portal.views import PortalTokenCreateView, PortalTokenView, PortalDocumentView, PortalActionView


urlpatterns = [
    path('tokens/', PortalTokenCreateView.as_view(), name='portal_token_create'),
    path('<str:token>/', PortalTokenView.as_view(), name='portal_token_view'),
    path('<str:token>/documents/<uuid:document_id>/', PortalDocumentView.as_view(), name='portal_document_view'),
    path('<str:token>/action/', PortalActionView.as_view(), name='portal_action'),
]

