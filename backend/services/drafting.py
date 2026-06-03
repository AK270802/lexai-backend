import json
import logging
import re
import tempfile
import uuid
from typing import Any, Dict, List, Optional, Tuple

from docx import Document as DocxDocument

from apps.drafts.models import DraftTemplate
from apps.documents.models import Document
from apps.matters.models import Matter
from apps.vault.models import ClauseVaultEntry
from services.llmrouter import LLMRouter
from services.prompts import drafting_prompt
from services.qdrant_client import QdrantClient
from services.storage import StorageService

logger = logging.getLogger(__name__)


PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_\.\-]+)\s*\}\}")


def extract_placeholders_from_docx(file_path: str) -> List[str]:
    doc = DocxDocument(file_path)
    found: List[str] = []
    
    def scan_text(t: str):
        for m in PLACEHOLDER_RE.finditer(t or ''):
            key = m.group(1)
            if key not in found:
                found.append(key)

    for p in doc.paragraphs:
        scan_text(p.text)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                scan_text(cell.text)
    return found


def default_template_variables(template_type: str) -> List[Dict[str, Any]]:
    common = [
        {"key": "party_a", "label": "Party A", "type": "text", "required": True},
        {"key": "party_b", "label": "Party B", "type": "text", "required": True},
        {"key": "effective_date", "label": "Effective Date", "type": "date", "required": True},
        {"key": "jurisdiction", "label": "Governing Law", "type": "text", "required": False},
        {"key": "special_terms", "label": "Special Terms", "type": "textarea", "required": False},
    ]
    if template_type == 'nda':
        return common + [
            {"key": "term_months", "label": "Term (months)", "type": "number", "required": False},
            {"key": "confidential_information_definition", "label": "Definition of Confidential Information", "type": "textarea", "required": False},
        ]
    if template_type == 'msa':
        return common + [
            {"key": "services_description", "label": "Services", "type": "textarea", "required": True},
            {"key": "fees", "label": "Fees", "type": "textarea", "required": False},
        ]
    if template_type == 'service_agreement':
        return common + [
            {"key": "services_description", "label": "Services", "type": "textarea", "required": True},
            {"key": "term_months", "label": "Term (months)", "type": "number", "required": False},
        ]
    if template_type == 'employment_agreement':
        return [
            {"key": "employer", "label": "Employer", "type": "text", "required": True},
            {"key": "employee", "label": "Employee", "type": "text", "required": True},
            {"key": "effective_date", "label": "Start Date", "type": "date", "required": True},
            {"key": "jurisdiction", "label": "Governing Law", "type": "text", "required": False},
            {"key": "role_title", "label": "Role Title", "type": "text", "required": True},
            {"key": "compensation", "label": "Compensation", "type": "textarea", "required": False},
            {"key": "special_terms", "label": "Special Terms", "type": "textarea", "required": False},
        ]
    return common


class DraftingService:
    def __init__(self, org_id: str):
        self.org_id = org_id
        self.router = LLMRouter(organization_id=org_id)
        self.qdrant = QdrantClient()
        self.storage = StorageService()

    def _preferred_clauses(self, query_text: str, category: Optional[str], limit: int = 5) -> Tuple[List[Dict[str, Any]], List[str]]:
        try:
            self.qdrant.ensure_collections()
            vec = self.router.embed(query_text)
            hits = self.qdrant.search_clause_library(vec, org_id=self.org_id, category=category, limit=limit)
            clause_ids: List[str] = []
            clauses: List[Dict[str, Any]] = []
            for h in hits:
                cid = h.get('clause_id') or (h.get('metadata') or {}).get('clause_id')
                if not cid:
                    continue
                clause_ids.append(str(cid))
            if clause_ids:
                for entry in ClauseVaultEntry.objects.filter(organization_id=self.org_id, id__in=clause_ids):
                    clauses.append({"id": str(entry.id), "label": entry.label, "category": entry.category, "text": entry.text})
            return clauses, clause_ids
        except Exception:
            return [], []

    def generate(self, *, template_type: str, template: Optional[DraftTemplate], inputs: Dict[str, Any], apply_preferred_clauses: bool) -> Dict[str, Any]:
        category_hint = template_type
        query_text = f"{template_type} drafting\n" + json.dumps(inputs, ensure_ascii=False)
        preferred, used_ids = ([], [])
        if apply_preferred_clauses:
            preferred, used_ids = self._preferred_clauses(query_text=query_text, category=category_hint, limit=5)

        preferred_block = "\n\n".join([f"- {c['label']} ({c['category']}):\n{c['text']}" for c in preferred])
        prompt = drafting_prompt(template_type, inputs, preferred_block)

        content = self.router.chat([{"role": "user", "content": prompt}], task='drafting')
        return {
            "draft_content": content.strip(),
            "used_clause_ids": used_ids,
            "warnings": [],
        }

    def save_to_matter(self, *, matter: Matter, user, title: str, template_type: str, draft_content: str, used_clause_ids: List[str]) -> Document:
        key = f"drafts/{self.org_id}/{matter.id}/{uuid.uuid4()}.md"
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.md', delete=False) as tmp:
            tmp.write(draft_content.encode('utf-8'))
            tmp_path = tmp.name

        try:
            with open(tmp_path, 'rb') as f:
                uploaded = self.storage.upload_file(f, key)
        finally:
            try:
                import os
                os.unlink(tmp_path)
            except Exception:
                pass
        if not uploaded:
            raise ValueError('Failed to upload draft content')

        doc = Document.objects.create(
            organization=matter.organization,
            matter=matter,
            file_name=title,
            file_type='text/markdown',
            file_size=len(draft_content.encode('utf-8')),
            storage_path=key,
            parse_status='completed',
            metadata={
                'is_draft': True,
                'template_type': template_type,
                'draft_content': draft_content,
                'used_clause_ids': used_clause_ids,
            },
            uploaded_by=user,
        )
        return doc
