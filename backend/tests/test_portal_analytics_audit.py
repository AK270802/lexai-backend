import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.authapp.models import Organization, User
from apps.matters.models import Matter
from apps.documents.models import Document
from services.portal_tokens import create_portal_token
from services.audit_service import log_audit
from apps.audit.models import AuditLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org(db):
    return Organization.objects.create(name='Org A')


@pytest.fixture
def other_org(db):
    return Organization.objects.create(name='Org B')


@pytest.fixture
def admin(db, org):
    return User.objects.create_user(email='admin@a.com', password='password123', name='Admin', organization=org, role='admin')


@pytest.fixture
def lawyer(db, org):
    return User.objects.create_user(email='lawyer@a.com', password='password123', name='Lawyer', organization=org, role='lawyer')


@pytest.fixture
def matter(db, org, lawyer):
    return Matter.objects.create(organization=org, title='Matter', description='', status='active', parties=[], created_by=lawyer)


@pytest.fixture
def doc(db, org, lawyer, matter):
    return Document.objects.create(
        organization=org,
        matter=matter,
        file_name='Doc.pdf',
        file_type='application/pdf',
        file_size=1,
        storage_path='documents/x.pdf',
        parse_status='completed',
        metadata={},
        uploaded_by=lawyer,
    )


def test_portal_token_public_access_and_expiration(api_client, org, lawyer, matter, doc, db):
    token_obj, raw = create_portal_token(organization=org, matter=matter, document=doc, created_by=lawyer, ttl_hours=1)

    res = api_client.get(f'/api/portal/{raw}/')
    assert res.status_code == status.HTTP_200_OK
    assert res.data['matter']['id'] == str(matter.id)
    assert len(res.data['documents']) == 1

    token_obj.expires_at = timezone.now() - timedelta(minutes=1)
    token_obj.save(update_fields=['expires_at'])
    res2 = api_client.get(f'/api/portal/{raw}/')
    assert res2.status_code == status.HTTP_404_NOT_FOUND
    assert res2.data['error'] == 'expired'


def test_portal_token_create_requires_auth(api_client, matter):
    res = api_client.post('/api/portal/tokens/', {'matter_id': str(matter.id)}, format='json')
    assert res.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_analytics_requires_auth(api_client):
    res = api_client.get('/api/analytics/overview/')
    assert res.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_audit_admin_only(api_client, admin, lawyer, org):
    log_audit(organization=org, actor=admin, action='test', entity_type='x', entity_id='1')

    api_client.force_authenticate(user=lawyer)
    res = api_client.get('/api/audit/')
    assert res.status_code == status.HTTP_403_FORBIDDEN

    api_client.force_authenticate(user=admin)
    res2 = api_client.get('/api/audit/')
    assert res2.status_code == status.HTTP_200_OK
    assert len(res2.data) >= 1 or len(res2.data.get('results', [])) >= 1
