import uuid
from django.db import models

from utils.models import BaseOrgModel


class PortalToken(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_prefix = models.CharField(max_length=12, db_index=True)
    token_hash = models.CharField(max_length=64, unique=True)

    matter = models.ForeignKey('matters.Matter', on_delete=models.CASCADE, related_name='portal_tokens')
    document = models.ForeignKey('documents.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='portal_tokens')

    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    single_use = models.BooleanField(default=False)
    permissions = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='created_portal_tokens')

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'expires_at']),
            models.Index(fields=['organization', 'matter']),
        ]

    def __str__(self):
        return f"PortalToken({self.token_prefix})"


class PortalAction(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.ForeignKey(PortalToken, on_delete=models.CASCADE, related_name='actions')
    action = models.CharField(max_length=50)
    actor_name = models.CharField(max_length=255, blank=True)
    actor_email = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'token', '-created_at']),
        ]

    def __str__(self):
        return f"PortalAction({self.action})"
