from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_all
from app.routers import (
    admin,
    auth,
    chat,
    consults,
    content,
    forum,
    lawyers,
    tax,
    triage,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # SQLite + a small schema: create tables on boot. Alembic handles real migrations.
    create_all()
    yield


app = FastAPI(
    title="AI Lawyer API",
    description=(
        "Backend for the AI Lawyer app. Two practice areas — immigration/visas and "
        "international tax & corporate structuring — sharing AI chat, structured case "
        "analysis, adviser matching, a peer forum, and the admin portal."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, chat, triage, tax, lawyers, consults, forum, content, admin):
    app.include_router(r.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {
        "status": "ok",
        "ai_enabled": settings.ai_enabled,
        "chat_model": settings.openai_chat_model,
    }
