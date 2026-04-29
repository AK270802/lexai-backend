import uuid
from django.db import models
from utils.models import BaseOrgModel

class ResearchQuery(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('authapp.User', on_delete=models.CASCADE, related_name='research_queries')
    matter = models.ForeignKey('matters.Matter', on_delete=models.SET_NULL, null=True, blank=True, related_name='research_queries')
    query = models.TextField()
    response = models.TextField(blank=True)
    citations = models.JSONField(default=list, blank=True)
    sources = models.JSONField(default=list, blank=True)
    model_used = models.CharField(max_length=100, blank=True)
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.query[:50]}..."
