# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run development server (ASGI via Daphne)
python manage.py runserver

# Run Celery worker
celery -A config.celery worker --loglevel=info

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Run all tests
pytest

# Run a single test file
pytest tests/test_contract_intelligence.py

# Run a specific test
pytest tests/test_contract_intelligence.py::TestFunctionName
```

## Architecture Overview

LexAI is a multi-tenant legal AI platform. Every resource is scoped to an `Organization`. The `.env` file is read from the **parent** directory (`../`) relative to `backend/`.

### Multi-tenancy pattern

All domain models inherit from `utils.models.BaseOrgModel` (abstract), which adds `organization` FK, `created_at`, and `updated_at`. Use `.objects.for_org(organization)` queryset method to scope queries. Never return data without filtering by org.

### Auth

Custom user model at `apps.authapp.User` (email-based login, roles: `admin`, `lawyer`, `paralegal`, `client`). JWT via `rest_framework_simplejwt` with rotating refresh tokens. The first user registered in an org is automatically `admin` (`RegisterSerializer` handles org creation).

### LLM routing (`services/llmrouter.py`)

`LLMRouter(organization_id=...)` supports two providers: `ollama` (local, default) and `openrouter`. Provider and model selection per task (`research`, `extraction`, `drafting`) are configured first from `Organization.llm_config` JSON, then from env vars. **Embeddings always use Ollama** regardless of the active provider.

### Document ingestion pipeline

1. Frontend gets a presigned upload URL from MinIO (`services/storage.py` wraps boto3 against MinIO S3-compatible API).
2. After upload, `tasks.ingestion.process_document_ingestion` Celery task is triggered.
3. `utils/doclingextractor.py` (Docling) extracts text blocks and tables with bounding boxes.
4. Chunks are stored in PostgreSQL (`apps.documents.DocumentChunk`) and upserted to Qdrant (`document_chunks` collection).
5. Full text is stored in `Document.metadata['full_text']`.
6. On completion, `tasks.contracts.extract_contract_clauses` is chained automatically.

### Vector store (`services/qdrant_client.py`)

Three Qdrant collections (auto-created via `ensure_collections()`):
- `document_chunks` — searchable text chunks, filtered by `org_id` and optionally `matter_id`
- `clause_library` — org-specific playbook clauses for deviation detection
- `research_history` — past research queries/responses

All searches enforce `org_id` filtering. Vector size defaults to 768 (set via `EMBED_DIMENSIONS`).

### Contract intelligence (`services/contract_intelligence.py`)

LLM extracts clauses from document full text → deduped → character spans located in source text → bounding boxes mapped from `DocumentChunk` records → compared against `clause_library` vectors to flag `standard_deviation`. Risk score is computed from clause `risk_level` weights.

### WebSockets

Django Channels + Daphne for ASGI. Two WebSocket endpoints defined in `config/routing.py`:
- `ws/notifications/` — real-time notifications
- `ws/matters/<matter_id>/` — matter-scoped collaboration

### Background tasks (`tasks/`)

Celery with Redis broker. Three task modules: `ingestion`, `contracts`, `notifications`. Registered explicitly in `config/celery.py` before `autodiscover_tasks`.

## Key environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for cache, Channels layer, and Celery broker/backend |
| `QDRANT_HOST` / `QDRANT_API_KEY` | Vector database |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | Object storage |
| `DEFAULT_LLM_PROVIDER` | `ollama` or `openrouter` |
| `OLLAMA_HOST` | Ollama base URL (default: `http://localhost:11434`) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `MODEL_RESEARCH` / `MODEL_EXTRACTION` / `MODEL_DRAFTING` / `MODEL_EMBEDDING` | Model names per task |
| `PLAYBOOK_SIMILARITY_THRESHOLD` | Cosine similarity threshold for clause deviation (default: `0.85`) |
| `EMBED_DIMENSIONS` | Qdrant vector size matching the embedding model (default: `768`) |
