"""Tax practice area: practice isolation, schema validity, and the ownership repair.

No OpenAI calls — the key is empty in the test environment, so the AI route is only
exercised for its guard.
"""

import pytest
from pydantic import ValidationError

from app.models.lawyer import Lawyer
from app.schemas.tax import (
    TAX_SPECIALTIES,
    AlternativeOut,
    ComplianceItemOut,
    EntityOut,
    TaxProfileOut,
    TaxRiskOut,
)
from app.services.matching import in_practice, rank_lawyers
from app.services.tax_service import normalise_ownership


def adviser(name, practices, jurisdiction="UK", specialties=None):
    return Lawyer(
        name=name,
        jurisdiction=jurisdiction,
        practices=practices,
        specialties=specialties or [],
        languages=["en"],
        rating=4.5,
        reviews_count=10,
        years_experience=10,
        hourly_rate=150,
    )


# --------------------------------------------------------------------------- #
# Practice isolation — the property that matters most
# --------------------------------------------------------------------------- #
def test_immigration_lawyers_never_match_a_tax_case():
    pool = [
        adviser("Visa Lawyer", ["immigration"], specialties=["work_visa"]),
        adviser("Tax Adviser", ["tax"], specialties=["corporate_structuring"]),
    ]
    ranked = rank_lawyers(pool, "UK", ["corporate_structuring"], "en", 5, "tax")

    assert [r.lawyer.name for r in ranked] == ["Tax Adviser"]


def test_tax_advisers_never_match_an_immigration_case():
    pool = [
        adviser("Visa Lawyer", ["immigration"], specialties=["work_visa"]),
        adviser("Tax Adviser", ["tax"], specialties=["corporate_structuring"]),
    ]
    ranked = rank_lawyers(pool, "UK", ["work_visa"], "en", 5, "immigration")

    assert [r.lawyer.name for r in ranked] == ["Visa Lawyer"]


def test_an_adviser_can_cover_both_practices():
    both = adviser("Dual Qualified", ["immigration", "tax"])
    assert in_practice(both, "immigration")
    assert in_practice(both, "tax")


def test_missing_practices_defaults_to_immigration():
    """Rows predating the tax feature must not silently appear in tax results."""
    legacy = adviser("Legacy Row", None)
    assert in_practice(legacy, "immigration")
    assert not in_practice(legacy, "tax")


def test_uk_is_a_first_class_jurisdiction():
    pool = [
        adviser("London", ["tax"], "UK", ["us_uk_tax"]),
        adviser("New York", ["tax"], "US", ["us_uk_tax"]),
    ]
    ranked = rank_lawyers(pool, "UK", ["us_uk_tax"], "en", 5, "tax")

    assert ranked[0].lawyer.name == "London"
    assert any("UK" in reason for reason in ranked[0].reasons)


# --------------------------------------------------------------------------- #
# Ownership normalisation — keeps the diagram renderable
# --------------------------------------------------------------------------- #
def _entity(name, owned_by="", role="trading"):
    return EntityOut(
        name=name,
        entity_type="US LLC",
        jurisdiction="US",
        role=role,
        owned_by=owned_by,
        ownership_pct=100,
        rationale="",
        tax_treatment="",
        setup_cost="",
        annual_cost="",
    )


def _profile(entities):
    return TaxProfileOut(
        residence_country="United Kingdom",
        primary_jurisdiction="UK",
        business_activity="AI software",
        revenue_flow="US customers",
        goal="Restructure",
        complexity="medium",
        summary="",
        current_entities=[],
        key_facts=[],
        proposed_structure=entities,
        structure_rationale="",
        alternatives=[],
        risks=[],
        compliance=[],
        estimated_setup_cost="",
        estimated_annual_cost="",
        suggested_specialties=[],
        red_flags=[],
    )


def test_dangling_parent_becomes_a_child_of_the_root():
    profile = normalise_ownership(
        _profile([
            _entity("Hold Co", role="holding"),
            _entity("Trading Co", owned_by="Ghost Co"),
        ])
    )
    names = {e.name: e.owned_by for e in profile.proposed_structure}
    assert names["Trading Co"] == "Hold Co"


def test_multiple_roots_are_collapsed_under_the_holding_entity():
    profile = normalise_ownership(
        _profile([
            _entity("UK Ltd"),
            _entity("Hold Co", role="holding"),
            _entity("AI Trading Co"),
        ])
    )
    roots = [e for e in profile.proposed_structure if not e.owned_by]
    assert [r.name for r in roots] == ["Hold Co"]
    assert all(
        e.owned_by == "Hold Co"
        for e in profile.proposed_structure
        if e.name != "Hold Co"
    )


def test_a_cycle_still_yields_exactly_one_root():
    profile = normalise_ownership(
        _profile([
            _entity("A", owned_by="B", role="holding"),
            _entity("B", owned_by="A"),
        ])
    )
    roots = [e for e in profile.proposed_structure if not e.owned_by]
    assert len(roots) == 1


def test_self_ownership_is_broken():
    profile = normalise_ownership(_profile([_entity("Solo", owned_by="Solo")]))
    assert profile.proposed_structure[0].owned_by == ""


def test_a_well_formed_tree_is_left_alone():
    profile = normalise_ownership(
        _profile([
            _entity("Hold Co", role="holding"),
            _entity("UK Ltd", owned_by="Hold Co"),
            _entity("AI Trading Co", owned_by="Hold Co"),
        ])
    )
    assert [e.owned_by for e in profile.proposed_structure] == ["", "Hold Co", "Hold Co"]


# --------------------------------------------------------------------------- #
# Schema
# --------------------------------------------------------------------------- #
def test_risk_category_and_severity_are_constrained():
    with pytest.raises(ValidationError):
        TaxRiskOut(
            title="x", category="made_up_category", severity="high",
            explanation="", mitigation="",
        )
    with pytest.raises(ValidationError):
        TaxRiskOut(
            title="x", category="cfc", severity="catastrophic",
            explanation="", mitigation="",
        )


def test_entity_jurisdiction_is_constrained_to_supported_countries():
    payload = {**_entity("Offshore Co").model_dump(), "jurisdiction": "XX"}
    with pytest.raises(ValidationError):
        EntityOut.model_validate(payload)


def test_entity_role_is_constrained():
    payload = {**_entity("Mystery Co").model_dump(), "role": "wildcard"}
    with pytest.raises(ValidationError):
        EntityOut.model_validate(payload)


def test_compliance_item_round_trips():
    item = ComplianceItemOut(
        name="Form 5471", jurisdiction="US", frequency="annual",
        deadline="With the income tax return", why="Foreign corporation reporting",
        mandatory=True,
    )
    assert item.model_dump()["name"] == "Form 5471"


def test_alternative_round_trips():
    alt = AlternativeOut(name="Keep it simple", why="Lower cost", tradeoff="No ring-fencing")
    assert alt.tradeoff


def test_tax_specialty_list_is_non_empty_and_slugged():
    assert TAX_SPECIALTIES
    assert all(s.islower() and " " not in s for s in TAX_SPECIALTIES)


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
def test_tax_analysis_requires_a_key(client, auth):
    res = client.post(
        "/api/tax/analyse",
        json={
            "description": "UK Ltd director, US-processed revenue, considering a Hold Co.",
            "jurisdiction": "UK",
            "locale": "en",
        },
        headers=auth,
    )
    assert res.status_code == 503
    assert "OPENAI_API_KEY" in res.json()["detail"]


def test_tax_routes_require_auth(client):
    assert client.post("/api/tax/analyse", json={}).status_code == 401
    assert client.get("/api/tax/1").status_code == 401


def test_unknown_tax_profile_is_404(client, auth):
    assert client.get("/api/tax/9999", headers=auth).status_code == 404


def test_directory_filters_by_practice(client, seeded_lawyers):
    immigration = client.get("/api/lawyers", params={"practice": "immigration"}).json()
    tax = client.get("/api/lawyers", params={"practice": "tax"}).json()

    assert len(immigration) == 3
    assert tax == []


def test_topics_are_scoped_by_practice(client):
    from app.db import SessionLocal
    from app.models.content import SuggestedTopic

    with SessionLocal() as db:
        db.add(SuggestedTopic(
            practice="tax", jurisdiction="UK", title_en="Hold Co?", title_es="¿Hold Co?",
        ))
        db.add(SuggestedTopic(
            practice="immigration", jurisdiction="UK", title_en="Visa?", title_es="¿Visado?",
        ))
        db.commit()

    tax = client.get("/api/topics", params={"practice": "tax", "jurisdiction": "UK"}).json()
    imm = client.get(
        "/api/topics", params={"practice": "immigration", "jurisdiction": "UK"}
    ).json()

    assert [t["title"] for t in tax] == ["Hold Co?"]
    assert [t["title"] for t in imm] == ["Visa?"]
