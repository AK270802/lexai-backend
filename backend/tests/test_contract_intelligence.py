import json

import pytest
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient

from apps.authapp.models import Organization, User
from apps.matters.models import Matter
from apps.documents.models import Document, DocumentChunk
from apps.contracts.models import ContractClause, Redline
from services.contract_intelligence import dedupe_clauses, extract_and_persist_clauses


@pytest.fixture
def organization(db):
    return Organization.objects.create(name='Test Org')


@pytest.fixture
def user(db, organization):
    return User.objects.create_user(
        email='lawyer@test.com',
        password='password123',
        name='Lawyer',
        organization=organization,
        role='lawyer',
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def matter(db, organization, user):
    return Matter.objects.create(
        organization=organization,
        title='Matter',
        description='',
        status='active',
        parties=[],
        created_by=user,
    )


@pytest.fixture
def document(db, organization, user, matter):
    return Document.objects.create(
        organization=organization,
        matter=matter,
        file_name='Contract.pdf',
        file_type='application/pdf',
        file_size=123,
        storage_path='documents/x.pdf',
        parse_status='completed',
        metadata={
            'full_text': 'Indemnification. The Vendor shall indemnify the Customer for losses.\n\nTermination. Either party may terminate.'
        },
        uploaded_by=user,
    )


def test_dedupe_clauses_keeps_highest_confidence():
    clauses = [
        {"clause_type": "Indemnification", "raw_text": "A", "confidence_score": 0.2},
        {"clause_type": "Indemnification", "raw_text": "A", "confidence_score": 0.8},
    ]
    out = dedupe_clauses(clauses)
    assert len(out) == 1
    assert out[0]['confidence_score'] == 0.8


@patch('services.llmrouter.LLMRouter.embed')
@patch('services.contract_intelligence.QdrantClient')
@patch('services.llmrouter.LLMRouter.chat')
def test_extract_and_persist_clauses_maps_bbox(mock_chat, mock_qdrant_cls, mock_embed, db, document):
    mock_chat.return_value = json.dumps([
        {
            "clause_type": "Indemnification",
            "raw_text": "Indemnification. The Vendor shall indemnify the Customer for losses.",
            "risk_level": "high",
            "risk_reason": "Broad indemnity.",
            "standard_deviation": False,
            "suggested_revision": "Limit indemnity to third-party claims.",
            "confidence_score": 0.9,
        }
    ])

    mock_embed.return_value = [0.1] * 768
    mock_qdrant = mock_qdrant_cls.return_value
    mock_qdrant.ensure_collections.return_value = None
    mock_qdrant.search_clause_library.return_value = []

    DocumentChunk.objects.create(
        document=document,
        chunk_index=0,
        content='Indemnification. The Vendor shall indemnify the Customer for losses.',
        bbox_coords={"bbox": [10, 20, 210, 60], "type": "paragraph"},
        page_number=1,
    )

    clauses = extract_and_persist_clauses(document)
    assert len(clauses) == 1
    clause = clauses[0]
    assert clause.page_number == 1
    assert clause.risk_level == 'high'
    assert clause.bbox_coords.get('highlights')
    hl = clause.bbox_coords['highlights'][0]
    assert hl['page_number'] == 1
    assert len(hl['rects']) == 1


def test_contract_clauses_api_org_scoped(api_client, user, document):
    api_client.force_authenticate(user=user)
    ContractClause.objects.create(
        document=document,
        clause_type='Termination',
        raw_text='Termination. Either party may terminate.',
        start_char=0,
        end_char=10,
        page_number=2,
        bbox_coords={"highlights": []},
        risk_level='none',
        risk_reason='',
        suggested_revision='',
        confidence_score=0.5,
    )
    res = api_client.get(f'/api/contracts/{document.id}/clauses/')
    assert res.status_code == status.HTTP_200_OK
    assert len(res.data) == 1


def test_redline_accept_reject(api_client, user, document):
    api_client.force_authenticate(user=user)
    clause = ContractClause.objects.create(
        document=document,
        clause_type='Termination',
        raw_text='Termination. Either party may terminate.',
        start_char=0,
        end_char=10,
        page_number=1,
        bbox_coords={"highlights": []},
        risk_level='low',
        risk_reason='.',
        suggested_revision='Termination. Either party may terminate upon 30 days notice.',
        confidence_score=0.7,
    )
    create = api_client.post(f'/api/contracts/{document.id}/redlines/', {"clause_id": str(clause.id), "action": "revision"}, format='json')
    assert create.status_code == status.HTTP_201_CREATED
    redline_id = create.data['id']

    accept = api_client.post(f'/api/contracts/{document.id}/redlines/{redline_id}/accept/', {})
    assert accept.status_code == status.HTTP_200_OK
    assert accept.data['status'] == 'accepted'

    reject = api_client.post(f'/api/contracts/{document.id}/redlines/{redline_id}/reject/', {})
    assert reject.status_code == status.HTTP_200_OK
    assert reject.data['status'] == 'rejected'

