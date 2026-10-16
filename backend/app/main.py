from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.core.config import settings
from app.core.database import Base, engine
from app.core.time_utils import get_ist_now
from app.api.webhook import router as webhook_router
import app.models  # Ensure all models are registered

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Initialize SQLite tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Smart Stack AI API",
    description="Inventory Management API with WhatsApp / SMS parsing for local shopkeepers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router)

@app.get("/health", tags=["System"])
def health_check() -> dict:
    return {
        "status": "healthy",
        "app": "Smart Stack AI",
        "timestamp": get_ist_now().isoformat()
    }
