from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.case import CaseProfile, TaxProfile
from app.models.lawyer import Lawyer
from app.models.user import User
from app.schemas.lawyer import LawyerMatchOut, LawyerOut, MatchIn
from app.security import get_current_user
from app.services.matching import in_practice, rank_lawyers

router = APIRouter(prefix="/lawyers", tags=["lawyers"])


@router.get("", response_model=list[LawyerOut])
def list_lawyers(
    db: Session = Depends(get_db),
    q: str = Query("", description="Free-text search over name, headline and city"),
    practice: str | None = Query(None, description="immigration | tax"),
    jurisdiction: str | None = Query(None),
    specialty: str | None = Query(None),
    language: str | None = Query(None),
    max_rate: int | None = Query(None),
    limit: int = Query(50, le=100),
) -> list[LawyerOut]:
    stmt = select(Lawyer).where(Lawyer.is_published.is_(True))
    if jurisdiction:
        stmt = stmt.where(Lawyer.jurisdiction == jurisdiction)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                Lawyer.name.ilike(like),
                Lawyer.headline.ilike(like),
                Lawyer.city.ilike(like),
                Lawyer.bio.ilike(like),
            )
        )
    if max_rate is not None:
        stmt = stmt.where(Lawyer.hourly_rate <= max_rate)

    rows = list(db.scalars(stmt.order_by(Lawyer.rating.desc()).limit(limit)))

    # specialties/languages/practices are JSON lists — filtered in Python so this stays
    # portable across SQLite and Postgres.
    if practice:
        rows = [r for r in rows if in_practice(r, practice)]
    if specialty:
        rows = [r for r in rows if specialty in (r.specialties or [])]
    if language:
        rows = [r for r in rows if language in (r.languages or [])]

    return [LawyerOut.model_validate(r) for r in rows]


@router.post("/match", response_model=list[LawyerMatchOut])
def match_lawyers(
    payload: MatchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LawyerMatchOut]:
    """Rank advisers against an analysis profile, or against ad-hoc criteria."""
    jurisdiction = payload.jurisdiction
    specialties = list(payload.specialties)

    if payload.profile_id is not None:
        if payload.practice == "tax":
            tax_profile = db.get(TaxProfile, payload.profile_id)
            if tax_profile is None or tax_profile.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Tax analysis not found"
                )
            jurisdiction = jurisdiction or tax_profile.primary_jurisdiction
            specialties = specialties or list(tax_profile.suggested_specialties or [])
        else:
            profile = db.get(CaseProfile, payload.profile_id)
            if profile is None or profile.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Case profile not found"
                )
            jurisdiction = jurisdiction or profile.target_jurisdiction
            specialties = specialties or list(profile.suggested_specialties or [])

    pool = list(db.scalars(select(Lawyer).where(Lawyer.is_published.is_(True))))
    ranked = rank_lawyers(
        pool, jurisdiction, specialties, payload.locale, payload.limit, payload.practice
    )

    return [
        LawyerMatchOut(
            **LawyerOut.model_validate(r.lawyer).model_dump(),
            match_score=r.score,
            match_reasons=r.reasons,
        )
        for r in ranked
    ]


@router.get("/{lawyer_id}", response_model=LawyerOut)
def get_lawyer(lawyer_id: int, db: Session = Depends(get_db)) -> LawyerOut:
    lawyer = db.get(Lawyer, lawyer_id)
    if lawyer is None or not lawyer.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lawyer not found"
        )
    return LawyerOut.model_validate(lawyer)
