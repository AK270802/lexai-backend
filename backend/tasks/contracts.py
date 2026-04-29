import logging

from celery import shared_task

from apps.documents.models import Document
from services.contract_intelligence import extract_and_persist_clauses

logger = logging.getLogger(__name__)


@shared_task
def extract_contract_clauses(document_id: str) -> int:
    document = Document.objects.get(id=document_id)
    if document.parse_status != 'completed':
        raise ValueError('Document parsing is not completed')
    
    document.clauses.all().delete()
    clauses = extract_and_persist_clauses(document)
    return len(clauses)

