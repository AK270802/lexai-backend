import logging
from typing import Dict, Any

from apps.vault.models import ClauseVaultEntry
from services.llmrouter import LLMRouter
from services.qdrant_client import QdrantClient

logger = logging.getLogger(__name__)


def upsert_clause_vault_entry(entry: ClauseVaultEntry) -> None:
    try:
        router = LLMRouter(organization_id=str(entry.organization_id))
        qdrant = QdrantClient()
        qdrant.ensure_collections()

        vector = router.embed(entry.text)
        qdrant.upsert_clause_library([
            {
                "id": str(entry.id),
                "vector": vector,
                "org_id": str(entry.organization_id),
                "clause_type": entry.category,
                "text": entry.text,
                "risk_level": entry.metadata.get("risk_level", "low") if isinstance(entry.metadata, dict) else "low",
                "metadata": {
                    "category": entry.category,
                    "label": entry.label,
                    "jurisdiction": entry.jurisdiction,
                    "clause_id": str(entry.id),
                },
            }
        ])
    except Exception as e:
        logger.error(f"Failed to upsert clause vault entry {entry.id} to Qdrant: {e}")

