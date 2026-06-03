import os
import logging
import tempfile
from celery import shared_task
from apps.documents.models import Document, DocumentChunk
from utils.doclingextractor import DoclingExtractor
from services.storage import StorageService
from services.embedding_service import EmbeddingService
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
        embedder = EmbeddingService.get_instance()
        qdrant = QdrantClient()
        qdrant.ensure_collections()

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{document.file_type.split('/')[-1]}") as tmp:
            logger.info(f"Downloading document {document.id} to {tmp.name}")
            if not storage.download_file(document.storage_path, tmp.name):
                raise Exception("Failed to download document from storage.")

            extraction = extractor.extract_layout(tmp.name)

            # Collect all content items (blocks + tables) before embedding
            items = []
            for i, block in enumerate(extraction["blocks"]):
                chunk_obj = DocumentChunk.objects.create(
                    document=document,
                    chunk_index=i,
                    content=block["text"],
                    bbox_coords={"bbox": block["bbox"], "type": block["type"]},
                    page_number=block["page_no"],
                )
                items.append({
                    "chunk_obj": chunk_obj,
                    "text": block["text"],
                    "page_no": block["page_no"],
                    "type": block["type"],
                    "bbox": block["bbox"],
                })

            table_offset = len(extraction["blocks"])
            for i, table in enumerate(extraction["tables"]):
                chunk_obj = DocumentChunk.objects.create(
                    document=document,
                    chunk_index=table_offset + i,
                    content=table["text"],
                    bbox_coords={"bbox": table["bbox"], "type": "table"},
                    page_number=table["page_no"],
                )
                items.append({
                    "chunk_obj": chunk_obj,
                    "text": table["text"],
                    "page_no": table["page_no"],
                    "type": "table",
                    "bbox": table["bbox"],
                })

            # Batch-embed all texts in one pass
            if items:
                texts = [item["text"] for item in items]
                embeddings = embedder.embed_batch(texts)

                chunks_to_upsert = []
                for item, embedding in zip(items, embeddings):
                    chunks_to_upsert.append({
                        "id": str(item["chunk_obj"].id),
                        "vector": embedding,
                        "org_id": str(document.organization.id),
                        "document_id": str(document.id),
                        "matter_id": str(document.matter.id) if document.matter else None,
                        "page_number": item["page_no"],
                        "text": item["text"],
                        "metadata": {"type": item["type"], "bbox": item["bbox"]},
                    })

                qdrant.upsert_document_chunks(chunks_to_upsert)
                logger.info(f"Upserted {len(chunks_to_upsert)} chunks for document {document.id}")

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
