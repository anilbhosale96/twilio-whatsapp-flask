# Smart Stack AI (Smart Stock AI)

> **Inventory Management Website with WhatsApp / SMS Input for Local Vendors**

Smart Stack AI enables small shopkeepers, kirana stores, and micro-retailers to manage inventory effortlessly via WhatsApp or SMS. Free-form text and voice messages ("Added 10kg rice, 5L oil", "sold 2 bread @20") are parsed into structured inventory transactions, and the responsive dashboard provides live updates in real time using Server-Sent Events (SSE).

---

## 🌟 Highlights
- **Conversational Inventory**: Natural language parsing in English, Hindi, Marathi, and Hinglish.
- **Voice Note Support**: Direct audio transcription and processing.
- **Real-Time Live Dashboard**: Instant status updates, top sellers, low-stock warnings, and transaction log.
- **One-Tap Undo**: Accidentally made a mistake? Send "undo" to reverse the last message batch.
- **Zero Heavy Stack Requirements**: FastAPI + SQLite (via SQLAlchemy 2.0) + React/Vite/Tailwind CSS.

---

## 📁 Repository Structure
```
├── backend/            # FastAPI backend, SQLAlchemy models, parsers, services
│   ├── app/
│   │   ├── api/        # REST & SSE endpoints, Twilio webhook
│   │   ├── core/       # Settings, DB sessions, logging
│   │   ├── models/     # SQLAlchemy ORM models (Vendor, Item, Transaction)
│   │   ├── parsers/    # Multilingual rule-based parser & LLM fallback
│   │   ├── services/   # Business logic (apply_changes, undo, reports)
│   │   └── main.py     # FastAPI application entrypoint
│   └── tests/          # Pytest suite with >= 30 test cases
├── frontend/           # React + Vite + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── components/ # Dashboard, Inventory, Alerts, ChatPreview, etc.
│   │   ├── hooks/      # Real-time SSE hook, API queries
│   │   └── types/      # Strictly typed TypeScript contracts
├── scripts/            # Database seeding, demo simulation, one-click runners
├── docs/               # Full specification pack (PRD, TRD, Schema, etc.)
├── CLAUDE.md           # Engineering guidelines & constraints
├── .env.example        # Environment variable blueprint
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
# Using uv or python
cd backend
uv venv
# or python -m venv .venv
# activate virtualenv
uv pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit the dashboard at `http://localhost:5173`.
Backend API docs available at `http://localhost:8000/docs`.

---

## 📜 Documentation Pack
Detailed specifications are in the [`docs/`](file:///d:/heloo%20world/docs) folder:
- [01-PRD.md](file:///d:/heloo%20world/docs/01-PRD.md)
- [02-TRD.md](file:///d:/heloo%20world/docs/02-TRD.md)
- [03-APP-FLOW.md](file:///d:/heloo%20world/docs/03-APP-FLOW.md)
- [04-UI-UX-DESIGN-BRIEF.md](file:///d:/heloo%20world/docs/04-UI-UX-DESIGN-BRIEF.md)
- [05-BACKEND-SCHEMA.md](file:///d:/heloo%20world/docs/05-BACKEND-SCHEMA.md)
- [06-IMPLEMENTATION-PLAN.md](file:///d:/heloo%20world/docs/06-IMPLEMENTATION-PLAN.md)
