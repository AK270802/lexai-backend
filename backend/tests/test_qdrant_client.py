import pytest
from unittest.mock import MagicMock, patch
from services.qdrant_client import QdrantClient

@pytest.fixture
def qdrant_client():
    with patch('qdrant_client.QdrantClient') as mock_q:
        client = QdrantClient()
        client.client = mock_q
        return client

def test_qdrant_ensure_collections(qdrant_client):
    qdrant_client.client.get_collection.side_effect = Exception("Not found")
    qdrant_client.ensure_collections()
    assert qdrant_client.client.create_collection.call_count == 3

def test_qdrant_upsert_document_chunks(qdrant_client):
    chunks = [{
        "id": "uuid-1",
        "vector": [0.1, 0.2],
        "org_id": "org-1",
        "document_id": "doc-1",
        "matter_id": "matter-1",
        "page_number": 1,
        "text": "Hello world"
    }]
    qdrant_client.upsert_document_chunks(chunks)
    qdrant_client.client.upsert.assert_called_once()

def test_qdrant_search_document_chunks_org_filter(qdrant_client):
    qdrant_client.client.search.return_value = []
    qdrant_client.search_document_chunks([0.1, 0.2], org_id="org-1")
    
    # Check that search was called with a filter for org_id
    args, kwargs = qdrant_client.client.search.call_args
    assert "query_filter" in kwargs
    # Filter(must=[FieldCondition(key='org_id', match=MatchValue(value='org-1'))])
    filter_obj = kwargs["query_filter"]
    assert filter_obj.must[0].key == "org_id"
    assert filter_obj.must[0].match.value == "org-1"

def test_qdrant_search_clause_library_org_filter(qdrant_client):
    qdrant_client.client.search.return_value = []
    qdrant_client.search_clause_library([0.1, 0.2], org_id="org-1")
    
    args, kwargs = qdrant_client.client.search.call_args
    filter_obj = kwargs["query_filter"]
    assert filter_obj.must[0].key == "org_id"
    assert filter_obj.must[0].match.value == "org-1"
