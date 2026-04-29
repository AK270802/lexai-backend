import uuid
from django.db import models

from utils.models import BaseOrgModel


class Comment(BaseOrgModel):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.ForeignKey('matters.Matter', on_delete=models.CASCADE, related_name='comments')
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    anchor = models.JSONField(default=dict, blank=True)
    text = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_comments')

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'matter', 'document', '-created_at']),
            models.Index(fields=['organization', 'document', 'status']),
        ]

    def __str__(self):
        return f"Comment {self.id}"

