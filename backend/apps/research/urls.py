from django.urls import path
from .views import ResearchHistoryView, ResearchDetailView, ResearchStreamView

urlpatterns = [
    path('history/', ResearchHistoryView.as_view(), name='research_history'),
    path('history/<uuid:id>/', ResearchDetailView.as_view(), name='research_detail'),
    path('stream/', ResearchStreamView.as_view(), name='research_stream'),
]
