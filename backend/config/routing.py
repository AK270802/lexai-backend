from django.urls import re_path

from apps.notifications.ws_consumers import NotificationsConsumer
from apps.matters.ws_consumers import MatterConsumer


websocket_urlpatterns = [
    re_path(r'^ws/notifications/$', NotificationsConsumer.as_asgi()),
    re_path(r'^ws/matters/(?P<matter_id>[0-9a-f-]+)/$', MatterConsumer.as_asgi()),
]

