import pytest

from channels.testing import WebsocketCommunicator
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from config.asgi import application
from apps.authapp.models import Organization, User
from apps.matters.models import Matter
from apps.documents.models import Document
from services.notifications_service import create_notification
from channels.db import database_sync_to_async


@pytest.fixture
def organization(db):
    return Organization.objects.create(name='Org')


@pytest.fixture
def lawyer(db, organization):
    return User.objects.create_user(email='lawyer@org.com', password='password123', name='Lawyer', organization=organization, role='lawyer')


@pytest.fixture
def other_lawyer(db, organization):
    return User.objects.create_user(email='lawyer2@org.com', password='password123', name='Second', organization=organization, role='lawyer')


@pytest.fixture
def matter(db, organization, lawyer):
    return Matter.objects.create(organization=organization, title='Matter', description='', status='active', parties=[], created_by=lawyer)


@pytest.fixture
def document(db, organization, lawyer, matter):
    return Document.objects.create(
        organization=organization,
        matter=matter,
        file_name='Doc.pdf',
        file_type='application/pdf',
        file_size=1,
        storage_path='x',
        parse_status='completed',
        metadata={},
        uploaded_by=lawyer,
    )


def token_for(user: User) -> str:
    t = AccessToken.for_user(user)
    return str(t)


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
async def test_ws_rejects_missing_token(matter):
    communicator = WebsocketCommunicator(application, f"/ws/matters/{matter.id}/")
    connected, _ = await communicator.connect()
    assert connected is False


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
async def test_ws_presence_join_leave(lawyer, other_lawyer, matter):
    c1 = WebsocketCommunicator(application, f"/ws/matters/{matter.id}/?token={token_for(lawyer)}")
    connected, _ = await c1.connect()
    assert connected is True
    msg = await c1.receive_json_from()
    assert msg["type"] == "presence.current"
    own_join = await c1.receive_json_from()
    assert own_join["type"] == "presence.join"

    c2 = WebsocketCommunicator(application, f"/ws/matters/{matter.id}/?token={token_for(other_lawyer)}")
    connected2, _ = await c2.connect()
    assert connected2 is True
    await c2.receive_json_from()

    join = await c1.receive_json_from()
    assert join["type"] == "presence.join"

    await c2.disconnect()
    leave = await c1.receive_json_from(timeout=3)
    assert leave["type"] == "presence.leave"
    await c1.disconnect()


@pytest.fixture
def api_client():
    return APIClient()


@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
def test_comment_create_reply_resolve_and_notification(api_client, lawyer, other_lawyer, matter, document, db):
    api_client.force_authenticate(user=other_lawyer)
    res = api_client.post('/api/comments/create/', {
        'matter_id': str(matter.id),
        'document_id': str(document.id),
        'text': 'Please confirm termination notice period.',
        'anchor': {'page_number': 2}
    }, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    comment_id = res.data['id']

    api_client.force_authenticate(user=lawyer)
    rep = api_client.post(f'/api/comments/{comment_id}/reply/', {'text': 'Noted. We should set 30 days.'}, format='json')
    assert rep.status_code == status.HTTP_201_CREATED

    notifs = api_client.get('/api/notifications/')
    assert notifs.status_code == status.HTTP_200_OK

    api_client.force_authenticate(user=other_lawyer)
    notifs2 = api_client.get('/api/notifications/?unread=1')
    assert notifs2.status_code == status.HTTP_200_OK
    assert notifs2.data['unread_count'] >= 1

    resolved = api_client.post(f'/api/comments/{comment_id}/resolve/', {}, format='json')
    assert resolved.status_code == status.HTTP_200_OK
    assert resolved.data['status'] == 'resolved'


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
async def test_notifications_ws_receives_created(lawyer):
    token = token_for(lawyer)
    comm = WebsocketCommunicator(application, f"/ws/notifications/?token={token}")
    connected, _ = await comm.connect()
    assert connected is True

    await database_sync_to_async(create_notification)(organization=lawyer.organization, user=lawyer, type='draft_generated', title='Draft ready', body='Your draft is ready.', data={})
    msg = await comm.receive_json_from()
    assert msg['type'] == 'notification.created'
    assert msg['notification']['title'] == 'Draft ready'
    await comm.disconnect()


@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
def test_notifications_mark_read(api_client, lawyer, db):
    api_client.force_authenticate(user=lawyer)
    n = create_notification(organization=lawyer.organization, user=lawyer, type='task_assigned', title='Task assigned', body='Test', data={})
    res = api_client.post(f'/api/notifications/{n.id}/read/', {}, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert res.data['read_at'] is not None

    api_client.post('/api/notifications/read-all/', {}, format='json')
