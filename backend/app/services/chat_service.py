from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from app.config import settings
from app.models.case import Message
from app.services.openai_client import get_client
from app.services.prompts import TITLE_SYSTEM_PROMPT, system_prompt_for

# Keep the tail of the conversation only — enough for continuity, bounded in cost.
MAX_HISTORY_MESSAGES = 20


def build_input(history: list[Message], user_message: str) -> list[dict]:
    recent = history[-MAX_HISTORY_MESSAGES:]
    items: list[dict] = [
        {"role": m.role, "content": m.content} for m in recent if m.content.strip()
    ]
    items.append({"role": "user", "content": user_message})
    return items


def sse(event: str, payload: dict) -> str:
    """Frame one server-sent event. The app parses `data:` lines as JSON."""
    return f"data: {json.dumps({'type': event, **payload}, ensure_ascii=False)}\n\n"


async def stream_reply(
    history: list[Message],
    user_message: str,
    jurisdiction: str,
    locale: str,
    practice: str = "immigration",
) -> AsyncGenerator[tuple[str, str], None]:
    """Yield (kind, value) pairs.

    kind is "delta" for an incremental text chunk, "done" for the final full text,
    or "error" for a failure message. The router turns these into SSE frames and is
    responsible for persisting the final text.
    """
    client = get_client()
    full: list[str] = []

    try:
        stream = await client.responses.create(
            model=settings.openai_chat_model,
            instructions=system_prompt_for(practice, jurisdiction, locale),
            input=build_input(history, user_message),
            reasoning={"effort": "low"},
            stream=True,
        )
        async for event in stream:
            etype = getattr(event, "type", "")
            if etype == "response.output_text.delta":
                delta = getattr(event, "delta", "") or ""
                if delta:
                    full.append(delta)
                    yield "delta", delta
            elif etype == "response.error":
                yield "error", "The assistant hit an error. Please try again."
                return
    except Exception as exc:  # network, auth, rate limit, model error
        # Surface something actionable without leaking internals to the client.
        yield "error", f"Could not reach the AI service: {type(exc).__name__}"
        return

    yield "done", "".join(full)


async def generate_title(first_message: str, locale: str) -> str:
    """Short session title for the sidebar/history list. Cheap model, best effort."""
    try:
        client = get_client()
        resp = await client.responses.create(
            model=settings.openai_cheap_model,
            instructions=TITLE_SYSTEM_PROMPT,
            input=[{"role": "user", "content": first_message[:600]}],
            reasoning={"effort": "none"},
        )
        title = (resp.output_text or "").strip().strip('"')
        return title[:80] or _fallback_title(first_message)
    except Exception:
        return _fallback_title(first_message)


def _fallback_title(text: str) -> str:
    words = text.strip().split()
    return " ".join(words[:6])[:80] or "New consultation"
