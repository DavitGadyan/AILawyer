from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.case import CaseProfile, ChatSession, ChecklistItem
from app.models.user import User
from app.schemas.triage import (
    CaseProfileResponse,
    ChecklistItemOut,
    ChecklistToggleIn,
    TriageIn,
)
from app.security import get_current_user
from app.services.openai_client import require_ai
from app.services.triage_service import run_triage

router = APIRouter(prefix="/triage", tags=["triage"])


def _to_response(profile: CaseProfile) -> CaseProfileResponse:
    return CaseProfileResponse(
        id=profile.id,
        session_id=profile.session_id,
        nationality=profile.nationality,
        current_country=profile.current_country,
        target_jurisdiction=profile.target_jurisdiction,
        current_status=profile.current_status,
        goal=profile.goal,
        urgency=profile.urgency,
        dependents=profile.dependents,
        summary=profile.summary,
        key_facts=profile.key_facts or [],
        recommended_routes=profile.recommended_routes or [],
        suggested_specialties=profile.suggested_specialties or [],
        red_flags=profile.red_flags or [],
        checklist=[ChecklistItemOut.model_validate(c) for c in profile.checklist],
    )


@router.post("", response_model=CaseProfileResponse)
async def create_triage(
    payload: TriageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseProfileResponse:
    """Turn a free-text situation into a structured case profile + document checklist."""
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
            jurisdiction=payload.jurisdiction,
            locale=payload.locale,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    try:
        parsed = await run_triage(payload.description, payload.jurisdiction, payload.locale)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Triage failed: {type(exc).__name__}",
        ) from exc

    # One profile per session — re-running triage replaces the previous read.
    existing = db.scalar(select(CaseProfile).where(CaseProfile.session_id == session.id))
    if existing is not None:
        db.delete(existing)
        db.flush()

    profile = CaseProfile(
        session_id=session.id,
        user_id=user.id,
        nationality=parsed.nationality,
        current_country=parsed.current_country,
        target_jurisdiction=parsed.target_jurisdiction,
        current_status=parsed.current_status,
        goal=parsed.goal,
        urgency=parsed.urgency,
        dependents=parsed.dependents,
        summary=parsed.summary,
        key_facts=parsed.key_facts,
        recommended_routes=[r.model_dump() for r in parsed.recommended_routes],
        suggested_specialties=parsed.suggested_specialties,
        red_flags=parsed.red_flags,
    )
    db.add(profile)
    db.flush()

    for doc in parsed.required_documents:
        db.add(
            ChecklistItem(
                profile_id=profile.id,
                name=doc.name,
                why=doc.why,
                mandatory=doc.mandatory,
            )
        )

    db.commit()
    db.refresh(profile)
    return _to_response(profile)


@router.get("/{profile_id}", response_model=CaseProfileResponse)
def get_profile(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseProfileResponse:
    profile = db.get(CaseProfile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Case profile not found"
        )
    return _to_response(profile)


@router.get("/by-session/{session_id}", response_model=CaseProfileResponse)
def get_profile_by_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CaseProfileResponse:
    profile = db.scalar(select(CaseProfile).where(CaseProfile.session_id == session_id))
    if profile is None or profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Case profile not found"
        )
    return _to_response(profile)


@router.patch("/checklist/{item_id}", response_model=ChecklistItemOut)
def toggle_checklist_item(
    item_id: int,
    payload: ChecklistToggleIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChecklistItemOut:
    item = db.get(ChecklistItem, item_id)
    if item is None or item.profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found"
        )
    item.is_done = payload.is_done
    db.commit()
    db.refresh(item)
    return ChecklistItemOut.model_validate(item)
