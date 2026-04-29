from django.urls import path

from apps.notifications.views import NotificationListView, NotificationMarkReadView, NotificationMarkAllReadView


urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),
    path('<uuid:id>/read/', NotificationMarkReadView.as_view(), name='notification_read'),
    path('read-all/', NotificationMarkAllReadView.as_view(), name='notification_read_all'),
]

