"""International tax & corporate structuring schemas.

`TaxProfileOut` and its children are handed to the OpenAI Responses API as `text_format`.
Structured Outputs runs in strict mode, so — as in `schemas/triage.py` — **no field here may
carry a default**. The API-facing models are at the bottom.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TaxJurisdiction = Literal["UK", "US", "EU", "ES"]
Complexity = Literal["low", "medium", "high"]
Severity = Literal["low", "medium", "high"]
EntityRole = Literal["holding", "trading", "ip", "finance", "dormant"]
RiskCategory = Literal[
    "permanent_establishment",
    "corporate_residence",
    "cfc",
    "transfer_pricing",
    "withholding_tax",
    "vat_sales_tax",
    "entity_classification",
    "exit_charge",
    "substance",
    "other",
]

TAX_SPECIALTIES = [
    "corporate_structuring",
    "cross_border_tax",
    "transfer_pricing",
    "us_uk_tax",
    "permanent_establishment",
    "vat_sales_tax",
    "rd_credits",
    "crypto_tax",
    "exit_planning",
    "personal_tax",
]


# --------------------------------------------------------------------------- #
# AI structured output — no defaults, all fields required (strict mode).
# --------------------------------------------------------------------------- #
class EntityOut(BaseModel):
    name: str = Field(description="Short label for the company, e.g. 'Hold Co' or 'UK Ltd'.")
    entity_type: str = Field(
        description="Legal form and where, e.g. 'US LLC (Wyoming)' or 'UK private limited company'."
    )
    jurisdiction: TaxJurisdiction = Field(description="Where this entity is incorporated.")
    role: EntityRole = Field(description="What this entity does in the group.")
    owned_by: str = Field(
        description=(
            "The `name` of the entity that owns this one. Use an empty string for the "
            "single entity at the top of the group."
        )
    )
    ownership_pct: int = Field(description="Percentage held by the owner, 0-100.")
    rationale: str = Field(description="Why this entity exists in the structure.")
    tax_treatment: str = Field(
        description=(
            "How it is likely treated for tax in the relevant countries, naming the point the "
            "adviser must confirm (e.g. US check-the-box classification vs the UK view)."
        )
    )
    setup_cost: str = Field(description="Approximate one-off formation cost, with currency.")
    annual_cost: str = Field(
        description="Approximate annual maintenance cost (filings, registered agent, accounts)."
    )


class TaxRiskOut(BaseModel):
    title: str = Field(description="Short name of the risk.")
    category: RiskCategory = Field(description="Which family of risk this belongs to.")
    severity: Severity = Field(description="How serious this is for the described facts.")
    explanation: str = Field(description="What could go wrong, in plain language.")
    mitigation: str = Field(description="What the user can do about it, concretely.")


class ComplianceItemOut(BaseModel):
    name: str = Field(description="The filing or obligation, e.g. 'Form 5471' or 'CT600'.")
    jurisdiction: TaxJurisdiction = Field(description="Which authority requires it.")
    frequency: str = Field(description="How often, e.g. 'annual', 'quarterly', 'one-off'.")
    deadline: str = Field(
        description="Typical due date, described relative to the period end where possible."
    )
    why: str = Field(description="Why this structure triggers it.")
    mandatory: bool = Field(description="True if legally required, false if merely advisable.")


class AlternativeOut(BaseModel):
    name: str = Field(description="A different structure that was considered.")
    why: str = Field(description="What it would achieve.")
    tradeoff: str = Field(description="Why it was not the primary recommendation.")


class TaxProfileOut(BaseModel):
    """Structured reading of a cross-border structuring question."""

    residence_country: str = Field(
        description="Where the founder/director is tax resident, or 'unknown'."
    )
    primary_jurisdiction: TaxJurisdiction = Field(
        description="The jurisdiction the analysis is anchored to."
    )
    business_activity: str = Field(description="What the business actually does.")
    revenue_flow: str = Field(
        description="Where customers are, where revenue is collected, and where work is done."
    )
    goal: str = Field(description="What the user is trying to achieve, in one sentence.")
    complexity: Complexity = Field(description="How involved this restructuring is.")
    summary: str = Field(description="Two neutral sentences summarising the situation.")
    current_entities: list[str] = Field(description="Companies the user already has.")
    key_facts: list[str] = Field(description="Salient facts extracted from the description.")
    proposed_structure: list[EntityOut] = Field(
        description=(
            "The recommended group. Exactly one entity must have an empty `owned_by`. "
            "Every other `owned_by` must exactly match another entity's `name`."
        )
    )
    structure_rationale: str = Field(
        description="Why this shape, in two or three sentences."
    )
    alternatives: list[AlternativeOut] = Field(
        description="Up to 2 structures considered and set aside."
    )
    risks: list[TaxRiskOut] = Field(description="Risks this structure creates, worst first.")
    compliance: list[ComplianceItemOut] = Field(
        description="Filings the structure triggers, mandatory ones first."
    )
    estimated_setup_cost: str = Field(description="Total one-off cost range for the group.")
    estimated_annual_cost: str = Field(description="Total annual running cost range.")
    suggested_specialties: list[str] = Field(
        description=(
            "Adviser specialty slugs matching this case. Choose ONLY from: "
            + ", ".join(TAX_SPECIALTIES)
            + "."
        )
    )
    red_flags: list[str] = Field(
        description=(
            "Anything needing urgent professional attention — an existing exposure, a "
            "deadline, or a step that must happen before another. Empty if none."
        )
    )


# --------------------------------------------------------------------------- #
# API surface
# --------------------------------------------------------------------------- #
class TaxAnalysisIn(BaseModel):
    description: str = Field(min_length=10, max_length=6000)
    jurisdiction: TaxJurisdiction = "UK"
    locale: str = "en"
    session_id: int | None = None


class StructureEntityOut(BaseModel):
    id: int
    name: str
    entity_type: str
    jurisdiction: str
    role: str
    owned_by: str
    ownership_pct: int
    rationale: str
    tax_treatment: str
    setup_cost: str
    annual_cost: str

    model_config = {"from_attributes": True}


class TaxRiskResponse(BaseModel):
    id: int
    title: str
    category: str
    severity: str
    explanation: str
    mitigation: str

    model_config = {"from_attributes": True}


class ComplianceItemResponse(BaseModel):
    id: int
    name: str
    jurisdiction: str
    frequency: str
    deadline: str
    why: str
    mandatory: bool
    is_done: bool

    model_config = {"from_attributes": True}


class TaxProfileResponse(BaseModel):
    id: int
    session_id: int
    residence_country: str
    primary_jurisdiction: str
    business_activity: str
    revenue_flow: str
    goal: str
    complexity: str
    summary: str
    structure_rationale: str
    estimated_setup_cost: str
    estimated_annual_cost: str
    current_entities: list[str]
    key_facts: list[str]
    alternatives: list[AlternativeOut]
    suggested_specialties: list[str]
    red_flags: list[str]
    entities: list[StructureEntityOut]
    risks: list[TaxRiskResponse]
    compliance: list[ComplianceItemResponse]

    model_config = {"from_attributes": True}


class ComplianceToggleIn(BaseModel):
    is_done: bool
