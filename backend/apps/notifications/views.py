from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Notification.objects.filter(organization=self.request.user.organization, user=self.request.user).order_by('-created_at')
        unread = self.request.query_params.get('unread')
        if unread in ('1', 'true', 'True'):
            qs = qs.filter(read_at__isnull=True)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        unread_count = Notification.objects.filter(organization=request.user.organization, user=request.user, read_at__isnull=True).count()
        data = NotificationSerializer(qs[:50], many=True).data
        return Response({"unread_count": unread_count, "results": data})


class NotificationMarkReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, id):
        n = Notification.objects.get(id=id, organization=request.user.organization, user=request.user)
        if n.read_at is None:
            n.read_at = timezone.now()
            n.save(update_fields=['read_at'])
        return Response(NotificationSerializer(n).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        Notification.objects.filter(organization=request.user.organization, user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({"ok": True}, status=status.HTTP_200_OK)

