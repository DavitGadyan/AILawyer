from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, status

from app.config import settings

# In-process sliding window. Adequate for a single-worker deployment; swap for Redis
# if this is ever run with multiple workers.
_hits: dict[int, list[float]] = defaultdict(list)
_WINDOW_SECONDS = 3600


def enforce_chat_limit(user_id: int) -> None:
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS
    recent = [t for t in _hits[user_id] if t > cutoff]
    if len(recent) >= settings.chat_rate_limit_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Hourly message limit reached. Please try again later.",
        )
    recent.append(now)
    _hits[user_id] = recent


def reset() -> None:
    """Test hook."""
    _hits.clear()
