# DOCUMENT 2: TECHNICAL REQUIREMENTS DOCUMENT (TRD)

## 2.1 Frontend Stack
- React + Vite + TypeScript + Tailwind CSS.
- Mobile-first and responsive.
- State: React hooks and Context only.
- Icons: Lucide (`lucide-react`).
- Fonts: Inter.

## 2.2 Backend Stack
- Python 3.11+ with FastAPI, run locally with `uvicorn`.
- SQLAlchemy 2.0 for data access.
- `pydantic-settings` for configuration.
- `httpx` for external calls.
- `pytest` for tests.
- Real-time updates use Server-Sent Events (`/api/stream`); do not use WebSockets.

## 2.3 Database
- SQLite (single local file, `smart_stack_ai.db`) accessed only through SQLAlchemy.
- A later move to PostgreSQL requires only changing the connection string.
- No external database service required.

## 2.4 Authentication
- MVP: no dashboard login (single local demo). Shopkeepers identified by their WhatsApp number from Twilio webhook. Phone numbers masked on the dashboard.
- Phase 2: dashboard login (e.g. OTP over WhatsApp).
- Webhook signature validation for Twilio request in production mode.

## 2.5 Third-Party Services
- Twilio WhatsApp Sandbox (messaging); Meta WhatsApp Business Cloud API for production.
- ngrok (public HTTPS tunnel to local backend for Twilio).
- Speech-to-text: OpenAI Whisper API or local faster-whisper (controlled via `STT_ENGINE`); ffmpeg for audio conversion.
- LLM fallback parser: Claude API (model set by `LLM_MODEL`), optional; Ollama if fully offline.

## 2.6 Hosting and Deployment
- Backend and database run locally; frontend runs on Vite dev server (port 5173), backend on port 8000, ngrok exposes port 8000.
- Production targets: Render/Railway/VPS for backend, Vercel/Netlify for frontend.

## 2.7 Constraints and Rules
- Python type hints and TypeScript strict mode.
- React functional components only.
- No UI library except Tailwind CSS. No new dependency without asking first.
- All secrets in `.env` file; commit only `.env.example`.
- Every backend module must have pytest tests. A phase is not finished until tests pass.
- All database changes for one WhatsApp message must happen in one transaction.
- LLM output is untrusted: validate strictly and discard anything invalid. Never let it crash the webhook.
- Use IST (UTC+05:30) for all dates shown to users. Currency shown in Rs. with Indian grouping.
- Make only the changes requested. Do not refactor or touch unrelated files.

## 2.8 Versioning and Environments
- Git and GitHub, one branch per phase.
- Environments: local development (seed data) and demo (ngrok URL with Twilio sandbox).
