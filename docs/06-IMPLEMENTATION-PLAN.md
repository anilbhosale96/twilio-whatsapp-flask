# DOCUMENT 6: IMPLEMENTATION PLAN

The plan assumes a 24-hour hackathon. Scale the hours proportionally for a longer or shorter event.

## Phase 0: Setup (about 1 hour)
- Foundation first: Install Python, Node, Git, ngrok and ffmpeg.
- Create folder structure (`backend`, `frontend`, `scripts`, `docs`).
- Git repository, `.env.example`, `README.md`.
- Put project rules from Document 2 into `CLAUDE.md`.
- **Done when**: Folder tree exists and git is initialised.

## Phase 1: Backend foundation and database (about 2 hours)
- Data layer before anything else.
- FastAPI project, SQLAlchemy models for `vendors`, `items`, and `transactions` (Document 5).
- Database setup, configuration from `.env`, `/health` endpoint.
- Tests on in-memory SQLite.
- **Done when**: `uvicorn` starts, `/health` responds, and `pytest` passes.

## Phase 2: Message parser (about 3 hours)
- Parse before you connect.
- Rule-based parser for add and sell words, quantity, unit, item, and optional price.
- Unit and name normalisation.
- Hindi and Marathi keywords.
- At least 30 test cases including typos and mixed case.
- **Done when**: All parser tests pass.

## Phase 3: Inventory logic and commands (about 3 hours)
- Business rules.
- `apply_changes` in one transaction.
- Low and negative stock warnings, `undo`, daily `report`, `stock` and `low` lists, `alert` levels.
- Command router with `help` reply.
- Tests including multi-item undo.
- **Done when**: A test calling the command handler with "sold 2 bread" returns the correct reply and stock.

## Phase 4: WhatsApp webhook and tunnel (about 2 hours)
- Connect to the real world.
- `POST /webhook` returning escaped TwiML.
- Run uvicorn and ngrok, set Twilio sandbox URL, test from a phone.
- **Done when**: A WhatsApp message "Added 10kg rice" gets a confirmation and row appears in database.

## Phase 5: Dashboard API and live stream (about 2 hours)
- Give the UI real data first.
- Summary, inventory, transactions, alerts, reports, settings, CSV export, Server-Sent Events stream with data-version counter.
- CORS for Vite dev server.
- Seed script with realistic demo data.
- Write the final API contract.
- **Done when**: All endpoints appear in `/docs` and the seed script fills the database.

## Phase 6: UI from Figma (about 4 hours)
- Design after the data works.
- Create Vite React TypeScript Tailwind app.
- Set colors, fonts and spacing as Tailwind tokens (Document 4).
- Build reusable components with mock data shaped like API contract.
- Responsive desktop and mobile; light and dark mode.
- **Done when**: The UI visually matches the specification using mock data.

## Phase 7: Connect UI to backend (about 2 hours)
- Make it live.
- Typed API client, live-data hook using event stream, connection indicator, loading, empty and error states, export button.
- **Done when**: Sending a WhatsApp message updates the screen within about 2 seconds without refresh.

## Phase 8: Voice notes and LLM fallback (about 3 hours)
- Advanced features last.
- Download Twilio audio with authentication, speech-to-text (Whisper / faster-whisper), echo transcript.
- LLM fallback parser with strict JSON validation, mocked tests including malformed output.
- **Done when**: A voice note "sold two bread" reduces bread and reply shows the transcript.

## Phase 9: Polish, testing and demo preparation (about 3 hours)
- Launch readiness.
- Rate limit per vendor, structured logging, Twilio signature check, README and troubleshooting guide.
- One-command start script, end-to-end test with 10 sample webhook payloads.
- Security review of secrets, input validation and XSS.
- Seed demo data, rehearse demo, record backup video.
- **Done when**: A fresh clone runs from README alone and demo script passes twice in a row.

## Rules for the AI
"Do not move to the next phase until the current phase is complete and tested. After each phase, review the code and fix errors. Make only the changes requested for the current phase."

