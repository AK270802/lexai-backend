import os
import json
import logging
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

from apps.contracts.models import ContractClause
from apps.documents.models import Document, DocumentChunk
from services.llmrouter import LLMRouter
from services.prompts import clause_extraction_prompt, missing_clause_prompt
from services.qdrant_client import QdrantClient
from utils.bboxconverter import Rect, docling_bbox_to_rect, merge_rects, rect_to_dict

logger = logging.getLogger(__name__)


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", t)
        t = t.rsplit("```", 1)[0]
    return t.strip()


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def find_span(full_text: str, needle: str) -> Optional[Tuple[int, int]]:
    if not full_text or not needle:
        return None
    idx = full_text.find(needle)
    if idx != -1:
        return idx, idx + len(needle)
    nf = _normalize(full_text)
    nn = _normalize(needle)
    idx2 = nf.find(nn)
    if idx2 != -1:
        return idx2, idx2 + len(needle)
    approx = full_text.lower().find(needle[: min(64, len(needle))].lower())
    if approx != -1:
        return approx, approx + len(needle)
    return None


def extract_clause_candidates(router: LLMRouter, full_text: str) -> List[Dict[str, Any]]:
    prompt = clause_extraction_prompt(full_text)
    response = router.chat([{"role": "user", "content": prompt}], task="extraction")
    cleaned = _strip_code_fences(response)
    clauses = json.loads(cleaned)
    if not isinstance(clauses, list):
        raise ValueError("Clause extraction response is not a list")
    return clauses


def dedupe_clauses(clauses: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    for c in clauses:
        raw_text = (c.get("raw_text") or "").strip()
        if not raw_text:
            continue
        key = f"{(c.get('clause_type') or '').strip().lower()}::{_normalize(raw_text).lower()}"
        conf = float(c.get("confidence_score") or 0)
        prev = best.get(key)
        if prev is None or float(prev.get("confidence_score") or 0) < conf:
            best[key] = c
    return list(best.values())


def map_clause_to_bboxes(
    *,
    full_text: str,
    start_char: int,
    end_char: int,
    chunks: List[DocumentChunk],
) -> Tuple[int, List[Dict[str, Any]]]:
    window_start = max(0, start_char - 2000)
    window_end = min(len(full_text), end_char + 2000)
    window = full_text[window_start:window_end]

    per_page: Dict[int, List[Rect]] = {}
    for ch in chunks:
        txt = ch.content or ""
        if not txt:
            continue
        snippet = _normalize(txt)[:80]
        if not snippet:
            continue
        pos = window.find(snippet)
        if pos == -1:
            continue
        abs_pos = window_start + pos
        if abs_pos > end_char + 500 or (abs_pos + len(snippet)) < start_char - 500:
            continue
        bbox = None
        if isinstance(ch.bbox_coords, dict):
            bbox = ch.bbox_coords.get("bbox")
        rect = docling_bbox_to_rect(bbox)
        if rect is None:
            continue
        per_page.setdefault(int(ch.page_number or 1), []).append(rect)

    if not per_page:
        return int(chunks[0].page_number if chunks else 1), []

    pages = sorted(per_page.keys())
    primary_page = pages[0]
    highlights: List[Dict[str, Any]] = []
    for p in pages:
        merged = merge_rects(per_page[p])
        highlights.append({"page_number": p, "rects": [rect_to_dict(r) for r in merged]})
    return primary_page, highlights


def playbook_deviation(
    *,
    router: LLMRouter,
    qdrant: QdrantClient,
    org_id: str,
    clause_text: str,
    clause_type: Optional[str] = None,
) -> Tuple[bool, Optional[float]]:
    try:
        vec = router.embed(clause_text)
        results = qdrant.search_clause_library(vec, org_id=org_id, clause_type=clause_type, limit=1)
        if not results:
            return False, None
        score = float(results[0].get("score") or 0)
        threshold = float(os.getenv("PLAYBOOK_SIMILARITY_THRESHOLD", 0.85))
        return score < threshold, score
    except Exception:
        return False, None


def contract_risk_score(clauses: Iterable[ContractClause]) -> float:
    weights = {"none": 0.0, "low": 0.15, "medium": 0.35, "high": 0.65, "critical": 0.9}
    total = 0.0
    count = 0
    for c in clauses:
        lvl = (c.risk_level or "none").lower()
        total += weights.get(lvl, 0.0)
        count += 1
    return round(total / count, 4) if count else 0.0


def detect_missing_clauses(router: LLMRouter, document_type: str, found_types: List[str]) -> List[Dict[str, Any]]:
    """Identify legally significant clauses absent from the document."""
    try:
        prompt = missing_clause_prompt(document_type, found_types)
        response = router.chat([{"role": "user", "content": prompt}], task="extraction")
        cleaned = _strip_code_fences(response)
        result = json.loads(cleaned)
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.warning(f"Missing clause detection failed: {e}")
        return []


def extract_and_persist_clauses(document: Document) -> List[ContractClause]:
    full_text = (document.metadata or {}).get("full_text") or ""
    if not full_text:
        raise ValueError("Document has no extracted full_text")

    chunks = list(DocumentChunk.objects.filter(document=document).order_by("chunk_index"))
    router = LLMRouter(organization_id=str(document.organization_id))
    qdrant = QdrantClient()
    qdrant.ensure_collections()

    candidates = extract_clause_candidates(router, full_text)
    candidates = dedupe_clauses(candidates)

    clauses: List[ContractClause] = []
    for c in candidates:
        raw_text = (c.get("raw_text") or "").strip()
        span = find_span(full_text, raw_text)
        if span is None:
            continue
        start_char, end_char = span
        primary_page, highlights = map_clause_to_bboxes(
            full_text=full_text,
            start_char=start_char,
            end_char=end_char,
            chunks=chunks,
        )

        risk_level = (c.get("risk_level") or "none").lower()
        if risk_level not in {"none", "low", "medium", "high", "critical"}:
            risk_level = "none"

        deviation_flag = bool(c.get("standard_deviation") or False)
        if not deviation_flag:
            deviation_flag, _ = playbook_deviation(
                router=router,
                qdrant=qdrant,
                org_id=str(document.organization_id),
                clause_text=raw_text,
                clause_type=(c.get("clause_type") or None),
            )

        clause = ContractClause.objects.create(
            document=document,
            clause_type=(c.get("clause_type") or "Other")[:100],
            raw_text=raw_text,
            start_char=start_char,
            end_char=end_char,
            page_number=primary_page,
            bbox_coords={"highlights": highlights},
            risk_level=risk_level,
            risk_reason=(c.get("risk_reason") or ""),
            standard_deviation=deviation_flag,
            suggested_revision=(c.get("suggested_revision") or ""),
            confidence_score=(
                float(c.get("confidence_score") or 0)
                if c.get("confidence_score") is not None
                else None
            ),
        )
        clauses.append(clause)

    return clauses
