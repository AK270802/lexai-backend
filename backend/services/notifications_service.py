import re
from typing import Dict, List, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from apps.authapp.models import User
from apps.notifications.models import Notification


EMAIL_MENTION_RE = re.compile(r"@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")


def create_notification(*, organization, user: User, type: str, title: str, body: str = '', data: Optional[Dict] = None) -> Notification:
    n = Notification.objects.create(
        organization=organization,
        user=user,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "notification.created",
            "notification": {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "data": n.data,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat(),
            },
        },
    )
    return n


def mark_read(notification: Notification) -> Notification:
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=['read_at'])
    return notification


def mention_users_from_text(*, organization, text: str) -> List[User]:
    emails = {m.group(1).lower() for m in EMAIL_MENTION_RE.finditer(text or '')}
    if not emails:
        return []
    return list(User.objects.filter(organization=organization, email__in=list(emails)))

