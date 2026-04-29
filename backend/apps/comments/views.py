import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.comments.models import Comment
from apps.comments.serializers import CommentSerializer, CommentCreateSerializer, CommentUpdateSerializer
from apps.documents.models import Document
from apps.matters.models import Matter
from services.notifications_service import create_notification, mention_users_from_text
from services.audit_service import log_audit
from tasks.notifications import create_notification_task


class IsInternalUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'lawyer', 'paralegal')


class CommentListView(generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = (IsInternalUser,)

    def get_queryset(self):
        qs = Comment.objects.filter(organization=self.request.user.organization, parent__isnull=True).order_by('-created_at')
        document_id = self.request.query_params.get('document_id')
        matter_id = self.request.query_params.get('matter_id')
        if document_id:
            qs = qs.filter(document_id=document_id)
        if matter_id:
            qs = qs.filter(matter_id=matter_id)
        return qs


class CommentCreateView(APIView):
    permission_classes = (IsInternalUser,)

    def post(self, request):
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        matter = Matter.objects.get(id=serializer.validated_data['matter_id'], organization=request.user.organization)
        document = Document.objects.get(id=serializer.validated_data['document_id'], organization=request.user.organization)
        if document.matter_id != matter.id:
            raise PermissionDenied('Document not in matter')

        c = Comment.objects.create(
            organization=request.user.organization,
            matter=matter,
            document=document,
            user=request.user,
            anchor=serializer.validated_data.get('anchor') or {},
            text=serializer.validated_data['text'],
        )
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='comment.created',
            entity_type='comment',
            entity_id=str(c.id),
            metadata={'matter_id': str(matter.id), 'document_id': str(document.id)},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"matter_{matter.id}",
            {
                "type": "comment.created",
                "comment": CommentSerializer(c).data,
            },
        )

        mentioned = mention_users_from_text(organization=request.user.organization, text=c.text)
        for u in mentioned:
            if u.id == request.user.id:
                continue
            try:
                create_notification_task.delay(
                    str(request.user.organization_id),
                    str(u.id),
                    'comment_mentioned',
                    'Mentioned in a comment',
                    c.text[:200],
                    {"matter_id": str(matter.id), "document_id": str(document.id), "comment_id": str(c.id)},
                )
            except Exception:
                create_notification(
                    organization=request.user.organization,
                    user=u,
                    type='comment_mentioned',
                    title='Mentioned in a comment',
                    body=c.text[:200],
                    data={"matter_id": str(matter.id), "document_id": str(document.id), "comment_id": str(c.id)},
                )

        return Response(CommentSerializer(c).data, status=status.HTTP_201_CREATED)


class CommentUpdateView(APIView):
    permission_classes = (IsInternalUser,)

    def patch(self, request, id):
        c = Comment.objects.get(id=id, organization=request.user.organization)
        if c.user_id != request.user.id and request.user.role != 'admin':
            raise PermissionDenied('Not allowed')
        serializer = CommentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if 'text' in serializer.validated_data:
            c.text = serializer.validated_data['text']
        c.save()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"matter_{c.matter_id}",
            {
                "type": "comment.updated",
                "comment": CommentSerializer(c).data,
            },
        )

        return Response(CommentSerializer(c).data)

    def delete(self, request, id):
        c = Comment.objects.get(id=id, organization=request.user.organization)
        if c.user_id != request.user.id and request.user.role != 'admin':
            raise PermissionDenied('Not allowed')
        matter_id = c.matter_id
        comment_id = str(c.id)
        c.delete()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"matter_{matter_id}",
            {
                "type": "comment.deleted",
                "comment_id": comment_id,
            },
        )
        return Response({"ok": True})


class CommentReplyView(APIView):
    permission_classes = (IsInternalUser,)

    def post(self, request, id):
        parent = Comment.objects.get(id=id, organization=request.user.organization)
        serializer = CommentCreateSerializer(data={
            "matter_id": str(parent.matter_id),
            "document_id": str(parent.document_id),
            "anchor": parent.anchor,
            "text": request.data.get('text', '')
        })
        serializer.is_valid(raise_exception=True)

        reply = Comment.objects.create(
            organization=request.user.organization,
            matter=parent.matter,
            document=parent.document,
            user=request.user,
            parent=parent,
            anchor=parent.anchor,
            text=serializer.validated_data['text'],
        )
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='comment.replied',
            entity_type='comment',
            entity_id=str(parent.id),
            metadata={'reply_id': str(reply.id), 'matter_id': str(parent.matter_id), 'document_id': str(parent.document_id)},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"matter_{parent.matter_id}",
            {
                "type": "comment.replied",
                "comment": CommentSerializer(parent).data,
                "reply": {"id": str(reply.id), "user_name": request.user.name, "text": reply.text, "created_at": reply.created_at.isoformat()},
            },
        )

        if parent.user_id and parent.user_id != request.user.id:
            try:
                create_notification_task.delay(
                    str(request.user.organization_id),
                    str(parent.user_id),
                    'comment_replied',
                    'Reply to your comment',
                    reply.text[:200],
                    {"matter_id": str(parent.matter_id), "document_id": str(parent.document_id), "comment_id": str(parent.id)},
                )
            except Exception:
                create_notification(
                    organization=request.user.organization,
                    user=parent.user,
                    type='comment_replied',
                    title='Reply to your comment',
                    body=reply.text[:200],
                    data={"matter_id": str(parent.matter_id), "document_id": str(parent.document_id), "comment_id": str(parent.id)},
                )

        return Response(CommentSerializer(parent).data, status=status.HTTP_201_CREATED)


class CommentResolveView(APIView):
    permission_classes = (IsInternalUser,)

    def post(self, request, id):
        c = Comment.objects.get(id=id, organization=request.user.organization)
        c.status = 'resolved'
        c.resolved_at = timezone.now()
        c.resolved_by = request.user
        c.save(update_fields=['status', 'resolved_at', 'resolved_by'])
        log_audit(
            organization=request.user.organization,
            actor=request.user,
            action='comment.resolved',
            entity_type='comment',
            entity_id=str(c.id),
            metadata={'matter_id': str(c.matter_id), 'document_id': str(c.document_id)},
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"matter_{c.matter_id}",
            {
                "type": "comment.resolved",
                "comment": CommentSerializer(c).data,
            },
        )
        return Response(CommentSerializer(c).data)
