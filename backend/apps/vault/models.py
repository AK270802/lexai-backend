import uuid
from django.db import models

from utils.models import BaseOrgModel


class ClauseVaultEntry(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    text = models.TextField()
    jurisdiction = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='created_vault_clauses')

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'category']),
            models.Index(fields=['organization', 'label']),
        ]

    def __str__(self):
        return f"{self.label} ({self.category})"
