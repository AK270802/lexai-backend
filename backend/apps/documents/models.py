import uuid
from django.db import models
from utils.models import BaseOrgModel

class Document(BaseOrgModel):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.ForeignKey('matters.Matter', on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    storage_path = models.CharField(max_length=500)
    parse_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    metadata = models.JSONField(default=dict, blank=True)
    uploaded_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')

    def __str__(self):
        return self.file_name

class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    content = models.TextField()
    bbox_coords = models.JSONField(default=dict, blank=True)
    page_number = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document.file_name} - Chunk {self.chunk_index}"
