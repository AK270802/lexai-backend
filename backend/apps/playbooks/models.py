import uuid
from django.db import models

from utils.models import BaseOrgModel


class Playbook(BaseOrgModel):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    rules = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='created_playbooks')

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'name']),
        ]

    def __str__(self):
        return self.name

