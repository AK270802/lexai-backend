# LexAI - Legal Intelligence SaaS

LexAI is a production-grade legal intelligence platform combining Harvey-style legal research and Legora-style matter management.

## Tech Stack

- **Backend**: Django 5, DRF, Celery, Redis, PostgreSQL
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui, Zustand
- **AI**: Ollama (local), OpenRouter (cloud), Qdrant (vector DB)
- **Document Processing**: Docling (layout-aware parsing)
- **Infrastructure**: Docker Compose, MinIO

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Ollama (running locally or in a container)
- OpenRouter API Key (optional)

### Setup

1. **Clone the repository**
2. **Copy `.env.template` to `.env` and fill in the values**
3. **Start the services**
   ```bash
   docker-compose up -d
   ```
4. **Run migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```
5. **Seed demo data (recommended)**
   ```bash
   docker-compose exec backend python manage.py seed_demo
   ```
   This prints demo credentials and a client portal token.

6. **Create a superuser (optional)**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```
Login credentials:
  admin@demo.lexai / password123
  lawyer@demo.lexai / password123
  client@demo.lexai / password123
Client portal token:
  tl76qLRumZgJHJRUv8Nzzc_o8PQ84yCokLIG2voT4pc
## Key Features

- **Auth & Organizations**: Multi-tenant RBAC with organization-scoped data.
- **Matter Management**: Kanban tasks, milestones, and collaborative deal rooms.
- **Document Ingestion**: PDF/DOCX parsing using Docling with layout-aware chunking.
- **Vector Search**: Document chunks and clause library stored in Qdrant with org-level filtering.
- **LLM Router**: Unified interface for Ollama and OpenRouter with task-specific model routing.
- **AI Research**: RAG-powered legal research with streaming responses and citations.
- **Contract Review**: Three-panel viewer with clause highlights and risk analysis.
- **Vault + Playbooks**: Manage preferred clause language and playbook guidance.
- **Drafting**: Template-driven drafting wizard with save-to-matter.
- **Client Portal**: Short-lived tokenized, read-only client access at `/client/[token]`.
- **Analytics**: Org-scoped dashboards at `/app/analytics`.
- **Audit Logs**: Admin-only audit viewer + CSV export at `/app/admin/audit`.

## LLM Configuration

Admins can configure LLM settings per organization at `/app/settings/llm`.
- **Ollama**: Requires an Ollama instance reachable by the backend.
- **OpenRouter**: Requires a valid API key.

## Vault + Playbooks

- Vault clauses API: `GET/POST /api/vault/clauses`, `GET/PATCH/DELETE /api/vault/clauses/:id`
- Playbooks API: `GET/POST /api/playbooks`, `GET/PATCH/DELETE /api/playbooks/:id`
- Clause vault entries are embedded and upserted into Qdrant `clause_library` on create/update.

## Drafting

- Templates: `GET /api/drafts/templates`
- Generate: `POST /api/drafts/generate`
- Save: `POST /api/drafts/save`

Draft generation returns plain legal text. Saving persists the draft as a matter `Document` with `file_type=text/markdown` and stores the draft content in `Document.metadata.draft_content`.

## Collaboration

- WebSocket endpoints:
  - `WS /ws/notifications/?token=...`
  - `WS /ws/matters/:matter_id/?token=...`
- Comments API:
  - `GET /api/comments?document_id=...&matter_id=...`
  - `POST /api/comments/create`
  - `PATCH/DELETE /api/comments/:id`
  - `POST /api/comments/:id/reply`
  - `POST /api/comments/:id/resolve`
- Notifications API:
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/read-all`

## Client Portal

- Create portal token (admin/lawyer): `POST /api/portal/tokens`
- Public portal meta: `GET /api/portal/:token`
- Public portal document + highlights: `GET /api/portal/:token/documents/:document_id`
- Public portal action (ack/approve/sign): `POST /api/portal/:token/action`

Frontend route: `GET /client/:token`

## Analytics + Audit

- Analytics overview: `GET /api/analytics/overview`
- Audit list (admin-only): `GET /api/audit`
- Audit export (admin-only): `GET /api/audit/export` (CSV)

## End-to-End Tests

Playwright E2E lives in `frontend/e2e/` and assumes the app is running (for example via `docker-compose up -d`) and demo data is seeded.

1. Seed demo data (prints portal token):
   ```bash
   docker-compose exec backend python manage.py seed_demo
   ```
2. Install Playwright and browsers:
   ```bash
   cd frontend
   npm install
   npx playwright install
   ```
3. Run E2E:
   ```bash
   E2E_PORTAL_TOKEN="<paste token>" npm run e2e
   ```
   Optional env overrides:
   - `E2E_BASE_URL` (default `http://localhost:3000`)
   - `E2E_API_URL` (default `http://localhost:8000/api`)
   - `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (defaults match `seed_demo`)

## Production

- Production scaffold: `docker-compose.prod.yml` + `nginx.conf`
- Backend runs ASGI (Daphne) for REST + WebSockets behind Nginx.

## Development

### Backend
- Directory: `backend/`
- Run tests: `pytest`
- Services: `backend/services/`

### Frontend
- Directory: `frontend/`
- Port: `3000`
- API Base: `http://localhost:8000/api`

## License

Proprietary
