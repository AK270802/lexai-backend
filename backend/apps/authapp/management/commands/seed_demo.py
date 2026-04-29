import io
import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.authapp.models import Organization, User
from apps.matters.models import Matter
from apps.documents.models import Document, DocumentChunk
from apps.contracts.models import ContractClause
from apps.research.models import ResearchQuery
from apps.notifications.models import Notification
from apps.vault.models import ClauseVaultEntry
from apps.playbooks.models import Playbook
from services.portal_tokens import create_portal_token
from services.storage import StorageService
from services.audit_service import log_audit


def build_minimal_pdf() -> bytes:
    lines = [
        "SAMPLE NDA (DEMO)",
        "1. Confidential Information. Each party agrees to protect the other party's confidential information.",
        "2. Term. The obligations survive for 24 months after the Effective Date.",
        "3. Indemnification. Vendor indemnifies Customer for third-party claims only.",
        "4. Governing Law. California.",
    ]
    content = ["BT", "/F1 12 Tf", "72 740 Td"]
    first = True
    for line in lines:
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if first:
            content.append(f"({safe}) Tj")
            first = False
        else:
            content.append("0 -20 Td")
            content.append(f"({safe}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("ascii")

    objs = []
    objs.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objs.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objs.append(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")
    objs.append(b"4 0 obj\n<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream\nendobj\n")
    objs.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    header = b"%PDF-1.4\n"
    body = b"".join(objs)

    offsets = [0]
    pos = len(header)
    for o in objs:
        offsets.append(pos)
        pos += len(o)

    xref_start = pos
    xref = [b"xref\n0 6\n", b"0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n".encode("ascii"))
    xref_bytes = b"".join(xref)

    trailer = b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + str(xref_start).encode("ascii") + b"\n%%EOF\n"
    return header + body + xref_bytes + trailer


class Command(BaseCommand):
    help = "Seed demo data for LexAI"

    def handle(self, *args, **options):
        org, _ = Organization.objects.get_or_create(name="LexAI Demo")

        admin, _ = User.objects.get_or_create(
            email="admin@demo.lexai",
            defaults={"name": "Demo Admin", "organization": org, "role": "admin"},
        )
        if not admin.check_password("password123"):
            admin.set_password("password123")
            admin.save()

        lawyer, _ = User.objects.get_or_create(
            email="lawyer@demo.lexai",
            defaults={"name": "Demo Lawyer", "organization": org, "role": "lawyer"},
        )
        if not lawyer.check_password("password123"):
            lawyer.set_password("password123")
            lawyer.save()

        client_user, _ = User.objects.get_or_create(
            email="client@demo.lexai",
            defaults={"name": "Demo Client", "organization": org, "role": "client"},
        )
        if not client_user.check_password("password123"):
            client_user.set_password("password123")
            client_user.save()

        matter, _ = Matter.objects.get_or_create(
            organization=org,
            title="Acme ↔ Contoso NDA Review",
            defaults={"description": "Demo matter for NDA review.", "status": "active", "parties": [], "created_by": lawyer},
        )

        pdf_bytes = build_minimal_pdf()
        storage = StorageService()
        key = f"documents/{org.id}/{uuid.uuid4()}.pdf"
        storage.upload_file(io.BytesIO(pdf_bytes), key)

        full_text = (
            "SAMPLE NDA (DEMO)\n"
            "1. Confidential Information. Each party agrees to protect the other party's confidential information.\n"
            "2. Term. The obligations survive for 24 months after the Effective Date.\n"
            "3. Indemnification. Vendor indemnifies Customer for third-party claims only.\n"
            "4. Governing Law. California.\n"
        )

        doc = Document.objects.create(
            organization=org,
            matter=matter,
            file_name="Sample NDA.pdf",
            file_type="application/pdf",
            file_size=len(pdf_bytes),
            storage_path=key,
            parse_status="completed",
            metadata={"full_text": full_text},
            uploaded_by=lawyer,
        )

        DocumentChunk.objects.create(
            document=doc,
            chunk_index=0,
            content=full_text,
            page_number=1,
            bbox_coords={"bbox": [60, 60, 520, 260], "type": "page"},
        )

        clauses = [
            ("Confidentiality", "Each party agrees to protect the other party's confidential information.", "medium", "Definition and scope may be too broad."),
            ("Term", "The obligations survive for 24 months after the Effective Date.", "low", "Term is within common range."),
            ("Indemnification", "Vendor indemnifies Customer for third-party claims only.", "low", "Indemnity is scoped to third-party claims."),
            ("Governing Law", "California.", "none", ""),
        ]
        for i, (ctype, raw, risk, reason) in enumerate(clauses):
            ContractClause.objects.create(
                document=doc,
                clause_type=ctype,
                raw_text=raw,
                start_char=0,
                end_char=len(raw),
                page_number=1,
                bbox_coords={
                    "highlights": [
                        {
                            "page_number": 1,
                            "rects": [{"x": 60, "y": 110 + (i * 28), "width": 500, "height": 18}],
                        }
                    ]
                },
                risk_level=risk,
                risk_reason=reason,
                standard_deviation=False,
                suggested_revision="",
                confidence_score=0.82,
            )

        ResearchQuery.objects.create(
            organization=org,
            user=lawyer,
            matter=matter,
            query="What is the indemnification scope in this NDA?",
            response="The indemnification clause is limited to third-party claims, which is generally lower risk than broad first-party indemnities.",
            citations=[],
            sources=[],
            model_used="demo",
        )

        Notification.objects.create(
            organization=org,
            user=lawyer,
            type="draft_generated",
            title="Demo: Draft ready",
            body="A demo draft has been generated for Acme ↔ Contoso.",
            data={"matter_id": str(matter.id)},
        )

        ClauseVaultEntry.objects.get_or_create(
            organization=org,
            label="Indemnification - Preferred (NDA)",
            category="nda",
            defaults={
                "text": "Each party will indemnify the other only for third-party claims arising from breach of this Agreement, subject to a reasonable cap.",
                "jurisdiction": "California",
                "metadata": {"preferred": True},
                "created_by": lawyer,
            },
        )

        Playbook.objects.get_or_create(
            organization=org,
            name="NDA Playbook",
            defaults={
                "description": "Preferred positions for NDAs.",
                "status": "active",
                "rules": [
                    {"category": "nda", "guidance": "Prefer mutual obligations; avoid broad definitions; cap indemnities."}
                ],
                "created_by": lawyer,
            },
        )

        token_obj, raw = create_portal_token(organization=org, matter=matter, document=doc, created_by=lawyer, ttl_hours=72, single_use=False)
        log_audit(organization=org, actor=lawyer, action="seed.demo", entity_type="matter", entity_id=str(matter.id), metadata={"portal_token_id": str(token_obj.id)})

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write("Login credentials:")
        self.stdout.write("  admin@demo.lexai / password123")
        self.stdout.write("  lawyer@demo.lexai / password123")
        self.stdout.write("  client@demo.lexai / password123")
        self.stdout.write("Client portal token:")
        self.stdout.write(f"  {raw}")
