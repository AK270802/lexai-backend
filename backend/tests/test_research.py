import pytest
import json
from unittest.mock import MagicMock, patch
from services.research_graph import create_research_graph, ResearchState
from apps.research.models import ResearchQuery
from rest_framework import status
from rest_framework.test import APIClient
from apps.authapp.models import User, Organization

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Test Org")

@pytest.fixture
def lawyer_user(db, organization):
    return User.objects.create_user(
        email="lawyer@test.com",
        password="password123",
        name="Lawyer User",
        organization=organization,
        role='lawyer'
    )

def test_research_graph_creation():
    graph = create_research_graph()
    assert graph is not None

@patch('services.llmrouter.LLMRouter.chat')
@patch('services.qdrant_client.QdrantClient.search_document_chunks')
@patch('services.llmrouter.LLMRouter.embed')
def test_research_graph_execution(mock_embed, mock_search, mock_chat, db, organization):
    mock_chat.return_value = json.dumps({"search_terms": "test search"})
    mock_search.return_value = [{"text": "Found text", "document_id": "doc-1"}]
    mock_embed.return_value = [0.1] * 768
    
    graph = create_research_graph()
    state = ResearchState(
        query="What is test?",
        org_id=str(organization.id),
        matter_id=None,
        extracted_filters={},
        chunks=[],
        reranked=[],
        answer="",
        citations=[],
        sources=[],
        status="analyzing"
    )
    
    final_state = graph.invoke(state)
    assert final_state["status"] == "completed"
    assert len(final_state["reranked"]) > 0

def test_research_history_api(api_client, lawyer_user, db):
    api_client.force_authenticate(user=lawyer_user)
    
    # Create a test query
    ResearchQuery.objects.create(
        organization=lawyer_user.organization,
        user=lawyer_user,
        query="Test query",
        response="Test response"
    )
    
    response = api_client.get('/api/research/history/')
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1

def test_research_stream_unauthorized(api_client):
    response = api_client.post('/api/research/stream/', {"query": "test"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
