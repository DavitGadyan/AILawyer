from __future__ import annotations

from app.config import settings
from app.schemas.tax import TaxProfileOut
from app.services.openai_client import get_client
from app.services.prompts import TAX_TRIAGE_SYSTEM_PROMPT, tax_analysis_user_prompt


async def run_tax_analysis(
    description: str, jurisdiction: str, locale: str
) -> TaxProfileOut:
    """Parse a free-text structuring question into a proposed group + risks + filings.

    Uses Structured Outputs, so the response is schema-valid or the SDK raises. Runs at a
    higher reasoning effort than visa triage: getting an entity group and its knock-on
    filings right involves considerably more chained inference.
    """
    client = get_client()
    resp = await client.responses.parse(
        model=settings.openai_triage_model,
        instructions=TAX_TRIAGE_SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": tax_analysis_user_prompt(description, jurisdiction, locale),
            }
        ],
        reasoning={"effort": "high"},
        text_format=TaxProfileOut,
    )
    parsed = resp.output_parsed
    if parsed is None:
        raise ValueError("Tax analysis returned no parsed output")
    return normalise_ownership(parsed)


def normalise_ownership(profile: TaxProfileOut) -> TaxProfileOut:
    """Guarantee the entity list forms a single tree the diagram can render.

    The schema asks for exactly one root and for every `owned_by` to name a real entity, but
    the model can still drift. Rather than fail the whole analysis on a bad edge, repair it:
    dangling parents become roots, and if that leaves several roots we keep the holding entity
    (or the first) and re-parent the rest under it.
    """
    entities = profile.proposed_structure
    if not entities:
        return profile

    names = {e.name for e in entities}
    for entity in entities:
        if entity.owned_by and entity.owned_by not in names:
            entity.owned_by = ""
        if entity.owned_by == entity.name:
            entity.owned_by = ""

    roots = [e for e in entities if not e.owned_by]
    if len(roots) > 1:
        preferred = next((e for e in roots if e.role == "holding"), roots[0])
        for entity in roots:
            if entity is not preferred:
                entity.owned_by = preferred.name
    elif not roots:
        # Every entity claims a parent — a cycle. Promote the holding entity.
        promoted = next((e for e in entities if e.role == "holding"), entities[0])
        promoted.owned_by = ""

    return profile
