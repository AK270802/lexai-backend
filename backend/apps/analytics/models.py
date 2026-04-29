import uuid
from django.db import models
from django.db.models import Sum, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from utils.models import BaseOrgModel


class DailyMetrics(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(unique=True)
    
    # Matter metrics
    matters_created = models.IntegerField(default=0)
    matters_closed = models.IntegerField(default=0)
    matters_active = models.IntegerField(default=0)
    
    # Document metrics
    documents_uploaded = models.IntegerField(default=0)
    documents_processed = models.IntegerField(default=0)
    documents_failed = models.IntegerField(default=0)
    
    # Research metrics
    research_queries = models.IntegerField(default=0)
    research_tokens_used = models.IntegerField(default=0)
    
    # Contract metrics
    clauses_extracted = models.IntegerField(default=0)
    redlines_created = models.IntegerField(default=0)
    redlines_accepted = models.IntegerField(default=0)
    
    # User activity
    active_users = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['organization', '-date']),
            models.Index(fields=['date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.organization.name} - {self.date}"


class UsageSnapshot(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Storage usage
    total_storage_bytes = models.BigIntegerField(default=0)
    document_storage_bytes = models.BigIntegerField(default=0)
    
    # Vector DB usage
    total_vectors = models.IntegerField(default=0)
    
    # User counts
    total_users = models.IntegerField(default=0)
    active_users_30d = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.organization.name} - {self.timestamp}"
