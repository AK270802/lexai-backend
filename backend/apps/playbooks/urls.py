from django.urls import path

from apps.playbooks.views import PlaybookListCreateView, PlaybookDetailView


urlpatterns = [
    path('', PlaybookListCreateView.as_view(), name='playbooks'),
    path('<uuid:id>/', PlaybookDetailView.as_view(), name='playbook_detail'),
]

