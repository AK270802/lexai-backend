from typing import Optional

from apps.audit.models import AuditLog


def log_audit(
    *,
    organization,
    actor=None,
    action: str,
    entity_type: str = '',
    entity_id: str = '',
    metadata: Optional[dict] = None,
) -> AuditLog:
    return AuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {},
    )

