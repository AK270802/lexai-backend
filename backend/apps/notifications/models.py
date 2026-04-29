import uuid
from django.db import models

from utils.models import BaseOrgModel


class Notification(BaseOrgModel):
    TYPE_CHOICES = (
        ('comment_replied', 'Comment replied'),
        ('comment_mentioned', 'Comment mentioned'),
        ('task_assigned', 'Task assigned'),
        ('clause_review_requested', 'Clause review requested'),
        ('portal_viewed', 'Portal viewed'),
        ('draft_generated', 'Draft generated'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('authapp.User', on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'user', '-created_at']),
            models.Index(fields=['organization', 'user', 'read_at']),
        ]

    def __str__(self):
        return f"{self.type} -> {self.user.email}"
