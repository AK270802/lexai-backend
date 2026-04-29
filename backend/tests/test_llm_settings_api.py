import pytest
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
def admin_user(db, organization):
    return User.objects.create_user(
        email="admin@test.com",
        password="password123",
        name="Admin User",
        organization=organization,
        role='admin'
    )

@pytest.fixture
def lawyer_user(db, organization):
    return User.objects.create_user(
        email="lawyer@test.com",
        password="password123",
        name="Lawyer User",
        organization=organization,
        role='lawyer'
    )

def test_llm_settings_get_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get('/api/auth/org/settings/llm/')
    assert response.status_code == status.HTTP_200_OK

def test_llm_settings_get_lawyer(api_client, lawyer_user):
    api_client.force_authenticate(user=lawyer_user)
    response = api_client.get('/api/auth/org/settings/llm/')
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_llm_settings_patch_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    data = {
        "provider": "openrouter",
        "models": {
            "research": "gpt-4",
            "extraction": "gpt-3.5-turbo",
            "drafting": "claude-3"
        }
    }
    response = api_client.patch('/api/auth/org/settings/llm/', data, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data["provider"] == "openrouter"
    assert response.data["models"]["research"] == "gpt-4"

def test_llm_settings_invalid_provider(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    data = {"provider": "invalid_provider"}
    response = api_client.patch('/api/auth/org/settings/llm/', data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
