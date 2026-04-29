from urllib.parse import parse_qs

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken


def get_token_from_scope(scope) -> str | None:
    qs = scope.get('query_string', b'').decode('utf-8')
    params = parse_qs(qs)
    if 'token' in params and params['token']:
        return params['token'][0]
    headers = dict(scope.get('headers') or [])
    auth = headers.get(b'authorization')
    if auth:
        try:
            val = auth.decode('utf-8')
            if val.lower().startswith('bearer '):
                return val.split(' ', 1)[1].strip()
        except Exception:
            return None
    return None


def authenticate_scope_user(scope):
    token = get_token_from_scope(scope)
    if not token:
        return None
    access = AccessToken(token)
    user_id = access.get('user_id')
    if not user_id:
        return None
    User = get_user_model()
    try:
        return User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return None

