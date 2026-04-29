import uuid
from django.db import models

from utils.models import BaseOrgModel


class AuditLog(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100, blank=True)
    entity_id = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['organization', 'action']),
            models.Index(fields=['organization', 'entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.action} {self.entity_type}:{self.entity_id}"

