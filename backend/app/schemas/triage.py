"""Triage schemas.

`CaseProfileOut` and its children are handed straight to the OpenAI Responses API as
`text_format`. Structured Outputs runs in strict mode, which requires *every* field to be
required — so nothing here may carry a default. The API-facing models live at the bottom.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Jurisdiction = Literal["US", "EU", "ES"]
Urgency = Literal["low", "medium", "high"]


# --------------------------------------------------------------------------- #
# AI structured output — no defaults, all fields required (strict mode).
# --------------------------------------------------------------------------- #
class Route(BaseModel):
    name: str = Field(description="Visa or permit route, e.g. 'H-1B' or 'EU Blue Card'.")
    fit_score: int = Field(description="How well this route fits the case, 0-100.")
    why: str = Field(description="One or two sentences on why this route fits.")
    typical_timeline: str = Field(description="Typical processing time, e.g. '4-8 months'.")
    est_cost: str = Field(description="Rough government + legal cost range, with currency.")


class DocumentItem(BaseModel):
    name: str = Field(description="Document the applicant must gather.")
    why: str = Field(description="Why this document is needed.")
    mandatory: bool = Field(description="True if required, false if merely supporting.")


class CaseProfileOut(BaseModel):
    """Structured reading of the user's free-text immigration situation."""

    nationality: str = Field(description="Applicant's nationality, or 'unknown'.")
    current_country: str = Field(description="Country they are currently in, or 'unknown'.")
    target_jurisdiction: Jurisdiction = Field(
        description="Where they want to go: US, EU (general/other member state), or ES (Spain)."
    )
    current_status: str = Field(
        description="Current immigration status, e.g. 'F-1 student', 'tourist', 'unknown'."
    )
    goal: str = Field(description="What the applicant is trying to achieve, in one sentence.")
    urgency: Urgency = Field(description="How time-critical the situation is.")
    dependents: int = Field(description="Number of accompanying family members. 0 if none.")
    summary: str = Field(description="Two-sentence neutral summary of the case.")
    key_facts: list[str] = Field(description="Salient facts extracted from the description.")
    recommended_routes: list[Route] = Field(
        description="Up to 3 candidate routes, best fit first."
    )
    required_documents: list[DocumentItem] = Field(
        description="Documents needed for the best-fit route."
    )
    suggested_specialties: list[str] = Field(
        description=(
            "Lawyer specialty slugs that match this case. Choose only from: work_visa, "
            "student_visa, family_reunification, asylum, citizenship, investor_visa, "
            "golden_visa, deportation_defense, appeals, permanent_residency, "
            "digital_nomad, business_immigration."
        )
    )
    red_flags: list[str] = Field(
        description="Risks or deadlines that need urgent professional attention. Empty if none."
    )


# --------------------------------------------------------------------------- #
# API surface
# --------------------------------------------------------------------------- #
class TriageIn(BaseModel):
    description: str = Field(min_length=10, max_length=6000)
    jurisdiction: Jurisdiction = "US"
    locale: str = "en"
    session_id: int | None = None


class ChecklistItemOut(BaseModel):
    id: int
    name: str
    why: str
    mandatory: bool
    is_done: bool

    model_config = {"from_attributes": True}


class CaseProfileResponse(BaseModel):
    id: int
    session_id: int
    nationality: str
    current_country: str
    target_jurisdiction: str
    current_status: str
    goal: str
    urgency: str
    dependents: int
    summary: str
    key_facts: list[str]
    recommended_routes: list[Route]
    suggested_specialties: list[str]
    red_flags: list[str]
    checklist: list[ChecklistItemOut]

    model_config = {"from_attributes": True}


class ChecklistToggleIn(BaseModel):
    is_done: bool
