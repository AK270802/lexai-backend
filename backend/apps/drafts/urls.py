from django.urls import path

from apps.drafts.views import DraftTemplateListView, DraftGenerateView, DraftSaveView


urlpatterns = [
    path('templates/', DraftTemplateListView.as_view(), name='draft_templates'),
    path('generate/', DraftGenerateView.as_view(), name='draft_generate'),
    path('save/', DraftSaveView.as_view(), name='draft_save'),
]

