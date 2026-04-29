import uuid
from django.db import models
from utils.models import BaseOrgModel

class Matter(BaseOrgModel):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
        ('on_hold', 'On Hold'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    parties = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='created_matters')

    def __str__(self):
        return f"{self.title} ({self.organization.name})"

class Task(BaseOrgModel):
    STATUS_CHOICES = (
        ('todo', 'Todo'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.ForeignKey(Matter, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    assigned_to = models.ForeignKey('authapp.User', on_delete=models.SET_NULL, null=True, related_name='assigned_tasks')
    due_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

class Milestone(BaseOrgModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matter = models.ForeignKey(Matter, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return self.title
