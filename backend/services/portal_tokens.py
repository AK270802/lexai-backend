import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional, Tuple

from django.conf import settings
from django.utils import timezone

from apps.portal.models import PortalToken


def _hash_token(raw: str) -> str:
    key = settings.SECRET_KEY.encode('utf-8')
    msg = raw.encode('utf-8')
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def create_portal_token(
    *,
    organization,
    matter,
    created_by,
    document=None,
    ttl_hours: int = 24,
    single_use: bool = False,
    permissions: Optional[dict] = None,
) -> Tuple[PortalToken, str]:
    raw = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw)
    token_prefix = raw[:12]
    expires_at = timezone.now() + timedelta(hours=ttl_hours)
    obj = PortalToken.objects.create(
        organization=organization,
        matter=matter,
        document=document,
        token_prefix=token_prefix,
        token_hash=token_hash,
        expires_at=expires_at,
        single_use=single_use,
        permissions=permissions or {"mode": "read", "actions": ["acknowledge"]},
        created_by=created_by,
    )
    return obj, raw


@dataclass(frozen=True)
class PortalTokenValidation:
    ok: bool
    error: Optional[str] = None
    token: Optional[PortalToken] = None


def validate_portal_token(raw: str) -> PortalTokenValidation:
    if not raw:
        return PortalTokenValidation(ok=False, error="missing")
    token_hash = _hash_token(raw)
    try:
        obj = PortalToken.objects.select_related('organization', 'matter', 'document').get(token_hash=token_hash)
    except PortalToken.DoesNotExist:
        return PortalTokenValidation(ok=False, error="invalid")

    now = timezone.now()
    if obj.expires_at <= now:
        return PortalTokenValidation(ok=False, error="expired")
    if obj.single_use and obj.used_at is not None:
        return PortalTokenValidation(ok=False, error="used")
    return PortalTokenValidation(ok=True, token=obj)

