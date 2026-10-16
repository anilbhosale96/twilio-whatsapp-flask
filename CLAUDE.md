# Smart Stack AI (Smart Stock AI) - Engineering Guidelines & Rules

## Project Overview
Smart Stack AI is an inventory management website with WhatsApp / SMS input for local Indian vendors (kirana stores, micro-retailers). Stock is updated via free-form text or voice messages sent over WhatsApp/SMS, and the website reflects live stock levels, sales, and low-stock alerts in real time without page refresh.

## Strict Rules and Constraints (from TRD Document 2)
1. **Type Safety & Components**:
   - Use Python type hints throughout the backend.
   - Use TypeScript strict mode throughout the frontend.
   - React functional components only.
2. **Dependencies & UI**:
   - No UI library except Tailwind CSS.
   - Do not add new dependencies without explicit necessity.
   - State management: React hooks and Context only.
   - Icons: Lucide (`lucide-react`).
   - Fonts: Inter. Mobile-first and responsive.
3. **Secrets & Config**:
   - All secrets in `.env` file; commit only `.env.example` with variable names.
   - Backend config via `pydantic-settings`.
4. **Testing**:
   - Every backend module must have `pytest` tests.
   - A phase is not finished until its tests pass.
5. **Database & Transactions**:
   - SQLite (`smart_stack_ai.db`) accessed only through SQLAlchemy 2.0.
   - All database changes for one WhatsApp message must happen in one transaction.
6. **LLM & External Input**:
   - LLM output is untrusted: validate strictly and discard anything invalid.
   - Never let parsing or LLM failures crash the webhook.
7. **Localization & Formatting**:
   - Use IST (`UTC+05:30`) for all dates shown to users.
   - Currency is shown in `Rs.` with Indian number grouping (e.g., `Rs. 1,24,500`).
   - Supported languages: English, Hindi, Marathi, and Hinglish.
8. **Real-time**:
   - Use Server-Sent Events (`/api/stream`); do NOT use WebSockets.
9. **Scope Control**:
   - Make only the changes requested. Do not refactor or touch unrelated files.
   - Do not move to the next phase until the current phase is complete and tested.

## Build Order (Document 6)
- Phase 0: Setup (tree, repo, docs, env.example, README)
- Phase 1: Backend foundation and database (FastAPI, SQLAlchemy models, in-memory SQLite tests, /health)
- Phase 2: Message parser (rule-based add/sell/units/quantities/Hindi/Marathi, >= 30 tests)
- Phase 3: Inventory logic and commands (transactional apply_changes, low/negative warnings, undo, report, alert)
- Phase 4: WhatsApp webhook and tunnel (/webhook returning TwiML)
- Phase 5: Dashboard API and live stream (SSE, CORS, seed data, API contract)
- Phase 6: UI from Figma (Vite + React + TS + Tailwind tokens)
- Phase 7: Connect UI to backend (SSE hook, real-time sync, CSV export)
- Phase 8: Voice notes & LLM fallback (Whisper STT, Claude/Ollama fallback)
- Phase 9: Polish, testing and demo prep

