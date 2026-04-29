import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APIClient

from apps.authapp.models import Organization, User
from apps.matters.models import Matter
from apps.documents.models import Document


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def organization(db):
    return Organization.objects.create(name='Test Org')


@pytest.fixture
def lawyer(db, organization):
    return User.objects.create_user(
        email='lawyer@t.com',
        password='password123',
        name='Lawyer',
        organization=organization,
        role='lawyer',
    )


@pytest.fixture
def client_user(db, organization):
    return User.objects.create_user(
        email='client@t.com',
        password='password123',
        name='Client',
        organization=organization,
        role='client',
    )


@pytest.fixture
def matter(db, organization, lawyer):
    return Matter.objects.create(
        organization=organization,
        title='Matter A',
        description='',
        status='active',
        parties=[],
        created_by=lawyer,
    )


@patch('apps.vault.views.upsert_clause_vault_entry')
def test_vault_clause_create_updates_vector(mock_upsert, api_client, lawyer):
    api_client.force_authenticate(user=lawyer)
    res = api_client.post('/api/vault/clauses/', {
        'label': 'Indemnity - Preferred',
        'category': 'msa',
        'text': 'Vendor shall indemnify Customer for third-party claims only.',
        'jurisdiction': 'California',
    }, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert mock_upsert.called


def test_vault_clause_client_cannot_create(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    res = api_client.post('/api/vault/clauses/', {
        'label': 'X',
        'category': 'nda',
        'text': 'Y',
    }, format='json')
    assert res.status_code == status.HTTP_403_FORBIDDEN


def test_playbook_create_permissions(api_client, lawyer, client_user):
    api_client.force_authenticate(user=client_user)
    res = api_client.post('/api/playbooks/', {'name': 'PB', 'status': 'draft', 'rules': []}, format='json')
    assert res.status_code == status.HTTP_403_FORBIDDEN

    api_client.force_authenticate(user=lawyer)
    res2 = api_client.post('/api/playbooks/', {'name': 'PB', 'status': 'draft', 'rules': []}, format='json')
    assert res2.status_code == status.HTTP_201_CREATED


@patch('services.llmrouter.LLMRouter.chat')
def test_draft_generate_shape(mock_chat, api_client, lawyer, matter):
    api_client.force_authenticate(user=lawyer)
    mock_chat.return_value = 'DRAFT CONTENT'
    res = api_client.post('/api/drafts/generate/', {
        'matter_id': str(matter.id),
        'template_type': 'nda',
        'title': 'Mutual NDA',
        'inputs': {
            'party_a': 'Acme',
            'party_b': 'Contoso',
            'effective_date': '2026-01-01'
        },
        'apply_preferred_clauses': False,
    }, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert 'draft_content' in res.data
    assert res.data['draft_content'] == 'DRAFT CONTENT'


@patch('services.drafting.StorageService')
def test_draft_save_creates_document(mock_storage_cls, api_client, lawyer, matter):
    api_client.force_authenticate(user=lawyer)
    mock_storage = mock_storage_cls.return_value
    mock_storage.upload_file.return_value = True

    res = api_client.post('/api/drafts/save/', {
        'matter_id': str(matter.id),
        'template_type': 'nda',
        'title': 'Mutual NDA - Draft',
        'draft_content': 'Hello world',
        'used_clause_ids': [],
    }, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    doc = Document.objects.get(id=res.data['document_id'])
    assert doc.matter_id == matter.id
    assert doc.metadata.get('is_draft') is True

