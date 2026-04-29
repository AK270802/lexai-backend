import os
import django

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Set up Django before importing any models
django.setup()

app = Celery('lexai')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Import tasks module to ensure registration (after Django setup)
from tasks import ingestion, contracts, notifications

# Auto-discover tasks from installed apps
app.autodiscover_tasks()

