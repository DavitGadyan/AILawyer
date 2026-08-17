from __future__ import annotations

from functools import lru_cache

from fastapi import HTTPException, status
from openai import AsyncOpenAI

from app.config import settings


@lru_cache
def get_client() -> AsyncOpenAI:
    """Single shared async client. The key is read from settings and never leaves the server."""
    return AsyncOpenAI(api_key=settings.openai_api_key)


def require_ai() -> AsyncOpenAI:
    """Guard for AI-backed routes so a missing key is a clean 503, not a 500."""
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI is not configured. Set OPENAI_API_KEY in backend/.env "
                "(copy .env.example) and restart the server."
            ),
        )
    return get_client()
