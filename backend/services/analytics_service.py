from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Count, F
from django.utils import timezone

from apps.comments.models import Comment
from apps.contracts.models import ContractClause
from apps.documents.models import Document
from apps.matters.models import Matter
from apps.notifications.models import Notification
from apps.research.models import ResearchQuery


def _range_from_params(date_from: Optional[str], date_to: Optional[str], range_days: int = 30) -> Tuple[datetime, datetime]:
    now = timezone.now()
    if date_to:
        try:
            end = datetime.fromisoformat(date_to)
            if timezone.is_naive(end):
                end = timezone.make_aware(end)
        except Exception:
            end = now
    else:
        end = now

    if date_from:
        try:
            start = datetime.fromisoformat(date_from)
            if timezone.is_naive(start):
                start = timezone.make_aware(start)
        except Exception:
            start = end - timedelta(days=range_days)
    else:
        start = end - timedelta(days=range_days)
    return start, end


def analytics_overview(*, organization, date_from: Optional[str] = None, date_to: Optional[str] = None, range_days: int = 30) -> Dict[str, Any]:
    start, end = _range_from_params(date_from, date_to, range_days)

    matter_counts = list(
        Matter.objects.filter(organization=organization)
        .values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    documents_uploaded = Document.objects.filter(organization=organization, created_at__gte=start, created_at__lte=end).count()
    total_documents = Document.objects.filter(organization=organization).count()

    risk_dist = list(
        ContractClause.objects.filter(document__organization=organization)
        .values('risk_level')
        .annotate(count=Count('id'))
        .order_by('risk_level')
    )

    research_count = ResearchQuery.objects.filter(organization=organization, created_at__gte=start, created_at__lte=end).count()
    research_by_model = list(
        ResearchQuery.objects.filter(organization=organization)
        .exclude(model_used='')
        .values('model_used')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    closed_matters = Matter.objects.filter(organization=organization, status__in=['closed', 'completed']).exclude(updated_at__isnull=True)
    avg_close_days = None
    if closed_matters.exists():
        durations = closed_matters.annotate(delta=F('updated_at') - F('created_at'))
        total = 0.0
        n = 0
        for m in durations[:200]:
            if m.delta is None:
                continue
            total += m.delta.total_seconds() / 86400.0
            n += 1
        if n:
            avg_close_days = round(total / n, 2)

    recent_activity: List[Dict[str, Any]] = []
    for d in Document.objects.filter(organization=organization).order_by('-created_at')[:10]:
        recent_activity.append({"type": "document", "title": f"Uploaded {d.file_name}", "created_at": d.created_at, "data": {"document_id": str(d.id), "matter_id": str(d.matter_id) if d.matter_id else None}})
    for q in ResearchQuery.objects.filter(organization=organization).order_by('-created_at')[:10]:
        recent_activity.append({"type": "research", "title": f"Research: {q.query[:60]}", "created_at": q.created_at, "data": {"research_id": str(q.id), "matter_id": str(q.matter_id) if q.matter_id else None}})
    for c in Comment.objects.filter(organization=organization).order_by('-created_at')[:10]:
        recent_activity.append({"type": "comment", "title": f"Comment: {c.text[:60]}", "created_at": c.created_at, "data": {"comment_id": str(c.id), "document_id": str(c.document_id), "matter_id": str(c.matter_id)}})
    for n in Notification.objects.filter(organization=organization).order_by('-created_at')[:10]:
        recent_activity.append({"type": "notification", "title": n.title, "created_at": n.created_at, "data": {"notification_id": str(n.id), "read": bool(n.read_at)}})
    recent_activity = sorted(recent_activity, key=lambda x: x["created_at"], reverse=True)[:20]

    return {
        "range": {"from": start.isoformat(), "to": end.isoformat(), "days": range_days},
        "kpis": {
            "matters_total": Matter.objects.filter(organization=organization).count(),
            "documents_total": total_documents,
            "documents_uploaded": documents_uploaded,
            "research_queries": research_count,
            "avg_matter_close_days": avg_close_days,
        },
        "matters_by_status": matter_counts,
        "clauses_risk_distribution": risk_dist,
        "research_by_model": research_by_model,
        "recent_activity": [
            {**a, "created_at": a["created_at"].isoformat()} for a in recent_activity
        ],
    }

