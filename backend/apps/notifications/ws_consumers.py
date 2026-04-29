from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from services.ws_jwt import authenticate_scope_user


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = await database_sync_to_async(authenticate_scope_user)(self.scope)
        if not user:
            await self.close(code=4401)
            return
        self.user = user
        await self.channel_layer.group_add(f"user_{user.id}", self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        user = getattr(self, 'user', None)
        if user:
            await self.channel_layer.group_discard(f"user_{user.id}", self.channel_name)

    async def notification_created(self, event):
        await self.send_json({"type": "notification.created", "notification": event['notification']})
