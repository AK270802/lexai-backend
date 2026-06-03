from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/auth/', include('apps.authapp.urls')),
    path('api/research/', include('apps.research.urls')),
    path('api/matters/', include('apps.matters.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/contracts/', include('apps.contracts.urls')),
    path('api/vault/', include('apps.vault.urls')),
    path('api/playbooks/', include('apps.playbooks.urls')),
    path('api/drafts/', include('apps.drafts.urls')),
    path('api/comments/', include('apps.comments.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/portal/', include('apps.portal.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
