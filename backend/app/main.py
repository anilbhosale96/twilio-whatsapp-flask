from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.core.config import settings
from app.core.database import Base, engine
from app.core.time_utils import get_ist_now
from app.core.middleware import SecurityHeadersMiddleware, RateLimitMiddleware
from app.api.webhook import router as webhook_router
from app.api.dashboard import router as dashboard_router
from app.api.auth import router as auth_router
import asyncio
from app.services.broadcaster import broadcaster
from sqlalchemy import text

def ensure_db_migrations():
    """Ensures newly added columns exist in existing SQLite databases."""
    try:
        with engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(vendors)")).fetchall()
            col_names = [r[1] for r in res]
            if "password_hash" not in col_names:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN password_hash VARCHAR(255)"))
            if "shop_name" not in col_names:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN shop_name VARCHAR(100)"))
            if "category" not in col_names:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN category VARCHAR(50) DEFAULT 'Grocery'"))
            conn.commit()
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Initialize SQLite tables on startup
    Base.metadata.create_all(bind=engine)
    ensure_db_migrations()
    broadcaster.set_loop(asyncio.get_running_loop())
    yield

app = FastAPI(
    title="Smart Stack AI API",
    description="Inventory Management API with WhatsApp / SMS parsing for local shopkeepers",
    version="1.0.0",
    debug=False,  # Debug mode disabled in production
    lifespan=lifespan
)

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# 3. Explicit CORS whitelist (no wildcards)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-KEY"],
)

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# 4. Routers
app.include_router(auth_router)
app.include_router(webhook_router)
app.include_router(dashboard_router)

@app.get("/health", tags=["System"])
def health_check() -> dict:
    return {
        "status": "healthy",
        "app": "Smart Stack AI",
        "timestamp": get_ist_now().isoformat()
    }

# 5. Serve frontend build if present (for direct port 8000, ngrok, and production deployment)
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_fallback(full_path: str):
        # Serve exact file if it exists (e.g. favicon.svg)
        target = _frontend_dist / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        # Otherwise return index.html for client-side routing
        return FileResponse(_frontend_dist / "index.html")


