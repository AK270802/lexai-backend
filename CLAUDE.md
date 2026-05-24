# LexAI

Full-stack legal AI platform (Django backend + Next.js 14 frontend).

## Structure

- `backend/` — Django 5 + DRF + Channels ASGI app. See `backend/CLAUDE.md` for full commands and architecture.
- `frontend/` — Next.js 14 + TypeScript + Tailwind CSS.

## Frontend commands

```bash
cd frontend
npm run dev       # dev server (Next.js)
npm run build     # production build
npm run lint      # ESLint
npm run e2e       # Playwright E2E tests
```

## Backend commands

```bash
cd backend
python manage.py runserver          # ASGI dev server via Daphne
celery -A config.celery worker --loglevel=info  # Celery worker
pytest                              # run all tests
python manage.py migrate            # apply migrations
```

## Key services

| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary database (multi-tenant, org-scoped) |
| Redis | Cache, Channels layer, Celery broker |
| Qdrant | Vector store (document chunks, clause library, research) |
| MinIO | Object storage (S3-compatible, document uploads) |
| Ollama | Local LLM + embeddings (default provider) |

## Environment

Copy `.env.template` to `.env` in the repo root. The backend reads `../.env` relative to `backend/`.
