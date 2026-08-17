from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.case import (
    ChatSession,
    ComplianceItem,
    StructureEntity,
    TaxProfile,
    TaxRisk,
)
from app.models.user import User
from app.schemas.tax import (
    ComplianceItemResponse,
    ComplianceToggleIn,
    TaxAnalysisIn,
    TaxProfileResponse,
)
from app.security import get_current_user
from app.services.openai_client import require_ai
from app.services.tax_service import run_tax_analysis

router = APIRouter(prefix="/tax", tags=["tax"])


def _to_response(profile: TaxProfile) -> TaxProfileResponse:
    return TaxProfileResponse(
        id=profile.id,
        session_id=profile.session_id,
        residence_country=profile.residence_country,
        primary_jurisdiction=profile.primary_jurisdiction,
        business_activity=profile.business_activity,
        revenue_flow=profile.revenue_flow,
        goal=profile.goal,
        complexity=profile.complexity,
        summary=profile.summary,
        structure_rationale=profile.structure_rationale,
        estimated_setup_cost=profile.estimated_setup_cost,
        estimated_annual_cost=profile.estimated_annual_cost,
        current_entities=profile.current_entities or [],
        key_facts=profile.key_facts or [],
        alternatives=profile.alternatives or [],
        suggested_specialties=profile.suggested_specialties or [],
        red_flags=profile.red_flags or [],
        entities=[e for e in profile.entities],
        risks=[r for r in profile.risks],
        compliance=[c for c in profile.compliance],
    )


@router.post("/analyse", response_model=TaxProfileResponse)
async def create_analysis(
    payload: TaxAnalysisIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaxProfileResponse:
    """Turn a free-text structuring question into a proposed group, risks and filings."""
    require_ai()

    if payload.session_id is not None:
        session = db.get(ChatSession, payload.session_id)
        if session is None or session.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )
    else:
        session = ChatSession(
            user_id=user.id,
            title=payload.description[:60],
            practice="tax",
            jurisdiction=payload.jurisdiction,
            locale=payload.locale,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    try:
        parsed = await run_tax_analysis(
            payload.description, payload.jurisdiction, payload.locale
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Tax analysis failed: {type(exc).__name__}",
        ) from exc

    # One analysis per session — re-running replaces the previous read.
    existing = db.scalar(select(TaxProfile).where(TaxProfile.session_id == session.id))
    if existing is not None:
        db.delete(existing)
        db.flush()

    profile = TaxProfile(
        session_id=session.id,
        user_id=user.id,
        residence_country=parsed.residence_country,
        primary_jurisdiction=parsed.primary_jurisdiction,
        business_activity=parsed.business_activity,
        revenue_flow=parsed.revenue_flow,
        goal=parsed.goal,
        complexity=parsed.complexity,
        summary=parsed.summary,
        structure_rationale=parsed.structure_rationale,
        estimated_setup_cost=parsed.estimated_setup_cost,
        estimated_annual_cost=parsed.estimated_annual_cost,
        current_entities=parsed.current_entities,
        key_facts=parsed.key_facts,
        alternatives=[a.model_dump() for a in parsed.alternatives],
        suggested_specialties=parsed.suggested_specialties,
        red_flags=parsed.red_flags,
    )
    db.add(profile)
    db.flush()

    for entity in parsed.proposed_structure:
        db.add(StructureEntity(profile_id=profile.id, **entity.model_dump()))
    for risk in parsed.risks:
        db.add(TaxRisk(profile_id=profile.id, **risk.model_dump()))
    for item in parsed.compliance:
        db.add(ComplianceItem(profile_id=profile.id, **item.model_dump()))

    db.commit()
    db.refresh(profile)
    return _to_response(profile)


@router.get("/by-session/{session_id}", response_model=TaxProfileResponse)
def get_by_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaxProfileResponse:
    profile = db.scalar(select(TaxProfile).where(TaxProfile.session_id == session_id))
    if profile is None or profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tax analysis not found"
        )
    return _to_response(profile)


@router.patch("/compliance/{item_id}", response_model=ComplianceItemResponse)
def toggle_compliance_item(
    item_id: int,
    payload: ComplianceToggleIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComplianceItemResponse:
    item = db.get(ComplianceItem, item_id)
    if item is None or item.profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Compliance item not found"
        )
    item.is_done = payload.is_done
    db.commit()
    db.refresh(item)
    return ComplianceItemResponse.model_validate(item)


@router.get("/{profile_id}", response_model=TaxProfileResponse)
def get_profile(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaxProfileResponse:
    profile = db.get(TaxProfile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tax analysis not found"
        )
    return _to_response(profile)
