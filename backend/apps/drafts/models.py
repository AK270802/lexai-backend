import uuid
from django.db import models

from utils.models import BaseOrgModel


class DraftTemplate(BaseOrgModel):
    TEMPLATE_CHOICES = (
        ('nda', 'NDA'),
        ('msa', 'MSA'),
        ('service_agreement', 'Service Agreement'),
        ('employment_agreement', 'Employment Agreement'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    storage_path = models.CharField(max_length=500, blank=True)
    variables = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='created_draft_templates')

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'template_type']),
            models.Index(fields=['organization', 'is_active']),
        ]

    def __str__(self):
        return self.title

