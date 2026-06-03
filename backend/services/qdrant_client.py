import os
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient as QClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

logger = logging.getLogger(__name__)

class QdrantClient:
    def __init__(self):
        self.url = os.getenv("QDRANT_HOST", "http://localhost:6333")
        self.api_key = os.getenv("QDRANT_API_KEY")
        self.client = QClient(url=self.url, api_key=self.api_key)
        self.vector_size = int(os.getenv("EMBED_DIMENSIONS", 384))

    def ensure_collections(self):
        """Create collections if they don't exist, recreate on dimension mismatch."""
        collections = ["document_chunks", "clause_library", "research_history"]
        for collection_name in collections:
            try:
                info = self.client.get_collection(collection_name)
                existing_size = info.config.params.vectors.size
                if existing_size != self.vector_size:
                    logger.warning(
                        f"Collection {collection_name} has dimension {existing_size}, "
                        f"expected {self.vector_size}. Recreating..."
                    )
                    self.client.delete_collection(collection_name)
                    raise Exception("dimension mismatch — recreate")
                logger.info(f"Collection {collection_name} OK (dim={existing_size}).")
            except Exception:
                logger.info(f"Creating collection {collection_name} (dim={self.vector_size})...")
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )

    def search(self, collection_name: str, query_vector: List[float], query_filter: Optional[Filter] = None, limit: int = 10, with_payload: bool = True):
        """Generic search method that delegates to the underlying client."""
        try:
            return self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=with_payload
            )
        except AttributeError:
            # Fallback for older Qdrant client versions that might use different API
            logger.warning("Qdrant client .search() method not found, trying alternative method")
            try:
                return self.client.query_points(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=with_payload
                )
            except AttributeError:
                raise AttributeError("Qdrant client does not support .search() or .query_points() methods")

    def upsert_document_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Upsert document chunks into Qdrant.
        Each chunk should have: id, vector, org_id, document_id, matter_id, page_number, text
        """
        points = [
            PointStruct(
                id=chunk["id"],
                vector=chunk["vector"],
                payload={
                    "org_id": str(chunk["org_id"]),
                    "document_id": str(chunk["document_id"]),
                    "matter_id": str(chunk["matter_id"]),
                    "page_number": chunk["page_number"],
                    "text": chunk["text"],
                    "metadata": chunk.get("metadata", {})
                }
            )
            for chunk in chunks
        ]
        self.client.upsert(collection_name="document_chunks", points=points)

    def search_document_chunks(
        self, 
        query_vector: List[float], 
        org_id: str, 
        matter_id: Optional[str] = None, 
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """Search document chunks with mandatory org_id filtering."""
        must_conditions = [
            FieldCondition(key="org_id", match=MatchValue(value=str(org_id)))
        ]
        if matter_id:
            must_conditions.append(FieldCondition(key="matter_id", match=MatchValue(value=str(matter_id))))

        search_result = self.client.search(
            collection_name="document_chunks",
            query_vector=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=limit,
            with_payload=True
        )
        return [{**(hit.payload or {}), "score": float(hit.score or 0)} for hit in search_result]

    def upsert_clause_library(self, items: List[Dict[str, Any]]):
        """
        Upsert clause library items.
        Each item should have: id, vector, org_id, clause_type/category, text
        """
        points = [
            PointStruct(
                id=item["id"],
                vector=item["vector"],
                payload={
                    "org_id": str(item["org_id"]),
                    "clause_type": item["clause_type"],
                    "category": item.get("category") or item.get("clause_type"),
                    "label": item.get("label"),
                    "clause_id": str(item.get("clause_id") or item["id"]),
                    "text": item["text"],
                    "risk_level": item.get("risk_level", "low"),
                    "metadata": item.get("metadata", {})
                }
            )
            for item in items
        ]
        self.client.upsert(collection_name="clause_library", points=points)

    def search_clause_library(
        self,
        query_vector: List[float],
        org_id: str,
        category: Optional[str] = None,
        clause_type: Optional[str] = None,
        limit: int = 8,
    ) -> List[Dict[str, Any]]:
        """Search clause library with mandatory org_id filtering."""
        must_conditions = [
            FieldCondition(key="org_id", match=MatchValue(value=str(org_id)))
        ]
        if category:
            must_conditions.append(FieldCondition(key="category", match=MatchValue(value=category)))
        if clause_type:
            must_conditions.append(FieldCondition(key="clause_type", match=MatchValue(value=clause_type)))

        search_result = self.client.search(
            collection_name="clause_library",
            query_vector=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=limit,
            with_payload=True
        )
        return [{**(hit.payload or {}), "score": float(hit.score or 0)} for hit in search_result]

    def upsert_research_history(self, items: List[Dict[str, Any]]):
        """Upsert research history."""
        points = [
            PointStruct(
                id=item["id"],
                vector=item["vector"],
                payload={
                    "org_id": str(item["org_id"]),
                    "user_id": str(item["user_id"]),
                    "query": item["query"],
                    "response": item["response"],
                    "metadata": item.get("metadata", {})
                }
            )
            for item in items
        ]
        self.client.upsert(collection_name="research_history", points=points)
