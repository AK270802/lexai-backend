from django.urls import path
from .views import DocumentListView, DocumentDetailView, DocumentUploadView

urlpatterns = [
    path('', DocumentListView.as_view(), name='document_list'),
    path('<uuid:id>/', DocumentDetailView.as_view(), name='document_detail'),
    path('upload/', DocumentUploadView.as_view(), name='document_upload'),
]
