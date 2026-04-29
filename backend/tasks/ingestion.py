import os
import logging
import tempfile
from celery import shared_task
from django.conf import settings
from apps.documents.models import Document, DocumentChunk
from utils.doclingextractor import DoclingExtractor
from services.storage import StorageService
from services.llmrouter import LLMRouter
from services.qdrant_client import QdrantClient
from tasks.contracts import extract_contract_clauses

logger = logging.getLogger(__name__)

@shared_task
def process_document_ingestion(document_id):
    try:
        document = Document.objects.get(id=document_id)
        document.parse_status = 'processing'
        document.save()

        storage = StorageService()
        extractor = DoclingExtractor()
        router = LLMRouter(organization_id=str(document.organization.id))
        qdrant = QdrantClient()
        qdrant.ensure_collections()

        # Download file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{document.file_type.split('/')[-1]}") as tmp:
            logger.info(f"Downloading document {document.id} to {tmp.name}")
            if not storage.download_file(document.storage_path, tmp.name):
                raise Exception("Failed to download document from storage.")
            
            # Perform extraction
            extraction = extractor.extract_layout(tmp.name)
            
            # Store chunks and generate embeddings
            chunks_to_upsert = []
            
            # Process text blocks
            for i, block in enumerate(extraction["blocks"]):
                # Create PostgreSQL entry
                chunk_obj = DocumentChunk.objects.create(
                    document=document,
                    chunk_index=i,
                    content=block["text"],
                    bbox_coords={
                        "bbox": block["bbox"],
                        "type": block["type"]
                    },
                    page_number=block["page_no"]
                )
                
                # Generate embedding
                embedding = router.embed(block["text"])
                
                # Prepare for Qdrant upsert
                chunks_to_upsert.append({
                    "id": str(chunk_obj.id),
                    "vector": embedding,
                    "org_id": str(document.organization.id),
                    "document_id": str(document.id),
                    "matter_id": str(document.matter.id) if document.matter else None,
                    "page_number": block["page_no"],
                    "text": block["text"],
                    "metadata": {
                        "type": block["type"],
                        "bbox": block["bbox"]
                    }
                })
            
            # Process tables as well
            table_offset = len(extraction["blocks"])
            for i, table in enumerate(extraction["tables"]):
                chunk_obj = DocumentChunk.objects.create(
                    document=document,
                    chunk_index=table_offset + i,
                    content=table["text"],
                    bbox_coords={
                        "bbox": table["bbox"],
                        "type": "table"
                    },
                    page_number=table["page_no"]
                )
                
                embedding = router.embed(table["text"])
                
                chunks_to_upsert.append({
                    "id": str(chunk_obj.id),
                    "vector": embedding,
                    "org_id": str(document.organization.id),
                    "document_id": str(document.id),
                    "matter_id": str(document.matter.id) if document.matter else None,
                    "page_number": table["page_no"],
                    "text": table["text"],
                    "metadata": {
                        "type": "table",
                        "bbox": table["bbox"]
                    }
                })

            # Upsert all chunks to Qdrant
            if chunks_to_upsert:
                qdrant.upsert_document_chunks(chunks_to_upsert)
            
            # Clean up temporary file
            os.unlink(tmp.name)

        document.parse_status = 'completed'
        document.metadata['full_text'] = extraction['full_text']
        document.save()
        logger.info(f"Successfully processed document {document.id}")

        extract_contract_clauses.delay(str(document.id))

    except Exception as e:
        logger.error(f"Error in document ingestion for document {document_id}: {str(e)}")
        try:
            document = Document.objects.get(id=document_id)
            document.parse_status = 'failed'
            document.metadata['error'] = str(e)
            document.save()
        except Document.DoesNotExist:
            pass
