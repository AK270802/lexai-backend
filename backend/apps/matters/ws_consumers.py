from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from apps.matters.models import Matter
from apps.authapp.models import User
from services.ws_jwt import authenticate_scope_user
from services.ws_presence import PresenceStore


class MatterConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = await database_sync_to_async(authenticate_scope_user)(self.scope)
        if not user:
            await self.close(code=4401)
            return
        if user.role == 'client':
            await self.close(code=4403)
            return

        matter_id = self.scope['url_route']['kwargs'].get('matter_id')
        try:
            matter = await database_sync_to_async(Matter.objects.get)(id=matter_id, organization_id=user.organization_id)
        except Matter.DoesNotExist:
            await self.close(code=4404)
            return

        self.user = user
        self.matter = matter
        self.group_name = f"matter_{matter.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(f"user_{user.id}", self.channel_name)

        await self.accept()

        store = PresenceStore()
        await database_sync_to_async(store.add)(org_id=str(user.organization_id), matter_id=str(matter.id), user_id=str(user.id))

        online_ids = await database_sync_to_async(store.list)(org_id=str(user.organization_id), matter_id=str(matter.id))
        users = await database_sync_to_async(list)(User.objects.filter(organization_id=user.organization_id, id__in=online_ids))
        participants = [
            {"id": str(u.id), "name": u.name, "role": u.role}
            for u in users
        ]
        await self.send_json({"type": "presence.current", "participants": participants})

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence.join",
                "user": {"id": str(user.id), "name": user.name, "role": user.role},
            },
        )

    async def disconnect(self, code):
        user = getattr(self, 'user', None)
        matter = getattr(self, 'matter', None)
        if user and matter:
            await self.channel_layer.group_send(
                f"matter_{matter.id}",
                {
                    "type": "presence.leave",
                    "user": {"id": str(user.id), "name": user.name, "role": user.role},
                },
            )
            try:
                store = PresenceStore()
                await database_sync_to_async(store.remove)(org_id=str(user.organization_id), matter_id=str(matter.id), user_id=str(user.id))
            except Exception:
                pass
            await self.channel_layer.group_discard(f"matter_{matter.id}", self.channel_name)
            await self.channel_layer.group_discard(f"user_{user.id}", self.channel_name)

    async def receive_json(self, content, **kwargs):
        t = content.get('type')
        if t == 'cursor.moved':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "cursor.moved",
                    "user": {"id": str(self.user.id), "name": self.user.name},
                    "data": content.get('data', {}),
                },
            )

    async def presence_join(self, event):
        await self.send_json({"type": "presence.join", "user": event['user']})

    async def presence_leave(self, event):
        await self.send_json({"type": "presence.leave", "user": event['user']})

    async def comment_created(self, event):
        await self.send_json({"type": "comment.created", "comment": event['comment']})

    async def comment_updated(self, event):
        await self.send_json({"type": "comment.updated", "comment": event['comment']})

    async def comment_resolved(self, event):
        await self.send_json({"type": "comment.resolved", "comment": event['comment']})

    async def comment_replied(self, event):
        await self.send_json({"type": "comment.replied", "comment": event['comment'], "reply": event.get('reply')})

    async def comment_deleted(self, event):
        await self.send_json({"type": "comment.deleted", "comment_id": event['comment_id']})

    async def notification_created(self, event):
        await self.send_json({"type": "notification.created", "notification": event['notification']})

    async def cursor_moved(self, event):
        await self.send_json({"type": "cursor.moved", "user": event['user'], "data": event.get('data', {})})
