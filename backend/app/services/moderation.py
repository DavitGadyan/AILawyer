from __future__ import annotations

from pydantic import BaseModel, Field

from app.config import settings
from app.services.openai_client import get_client
from app.services.prompts import MODERATION_SYSTEM_PROMPT


class ModerationVerdict(BaseModel):
    allow: bool = Field(description="False only for harassment, doxxing, spam, or fraud advice.")
    reason: str = Field(description="Short reason when allow is false, otherwise an empty string.")


async def check_post(text: str) -> ModerationVerdict:
    """Pre-screen a forum post.

    Fails open: if the key is missing or the call errors, the post is allowed. A support
    forum going down because moderation is unavailable would be worse than the miss, and
    every post is still reportable by users and reviewable in the admin queue.
    """
    if not settings.ai_enabled:
        return ModerationVerdict(allow=True, reason="")
    try:
        client = get_client()
        resp = await client.responses.parse(
            model=settings.openai_cheap_model,
            instructions=MODERATION_SYSTEM_PROMPT,
            input=[{"role": "user", "content": text[:4000]}],
            reasoning={"effort": "none"},
            text_format=ModerationVerdict,
        )
        return resp.output_parsed or ModerationVerdict(allow=True, reason="")
    except Exception:
        return ModerationVerdict(allow=True, reason="")
