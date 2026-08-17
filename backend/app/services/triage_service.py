from __future__ import annotations

from app.config import settings
from app.schemas.triage import CaseProfileOut
from app.services.openai_client import get_client
from app.services.prompts import TRIAGE_SYSTEM_PROMPT, triage_user_prompt


async def run_triage(
    description: str, jurisdiction: str, locale: str
) -> CaseProfileOut:
    """Parse a free-text situation into a structured case profile.

    Uses Structured Outputs, so the response is schema-valid or the SDK raises —
    there is no JSON parsing or repair to do here.
    """
    client = get_client()
    resp = await client.responses.parse(
        model=settings.openai_triage_model,
        instructions=TRIAGE_SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": triage_user_prompt(description, jurisdiction, locale),
            }
        ],
        reasoning={"effort": "medium"},
        text_format=CaseProfileOut,
    )
    parsed = resp.output_parsed
    if parsed is None:
        raise ValueError("Triage returned no parsed output")
    return parsed
