import uuid
from django.db import models
from utils.models import BaseOrgModel

class ContractClause(models.Model):
    RISK_LEVEL_CHOICES = (
        ('none', 'None'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, related_name='clauses')
    clause_type = models.CharField(max_length=100)
    raw_text = models.TextField()
    start_char = models.IntegerField()
    end_char = models.IntegerField()
    page_number = models.IntegerField()
    bbox_coords = models.JSONField()
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, null=True, blank=True)
    risk_reason = models.TextField(blank=True)
    standard_deviation = models.BooleanField(default=False)
    suggested_revision = models.TextField(blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    extracted_by = models.CharField(max_length=50, default='ai')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['document', 'risk_level']),
        ]

    def __str__(self):
        return f"{self.clause_type} - {self.document.file_name}"

class Redline(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clause = models.ForeignKey(ContractClause, on_delete=models.CASCADE, related_name='redlines')
    user = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)  # e.g., 'revision', 'deletion'
    original_text = models.TextField()
    revised_text = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Redline for {self.clause.clause_type}"
