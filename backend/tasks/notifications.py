from celery import shared_task

from apps.authapp.models import Organization, User
from services.notifications_service import create_notification


@shared_task
def create_notification_task(organization_id: str, user_id: str, type: str, title: str, body: str = '', data: dict | None = None):
    org = Organization.objects.get(id=organization_id)
    user = User.objects.get(id=user_id)
    create_notification(organization=org, user=user, type=type, title=title, body=body, data=data or {})

