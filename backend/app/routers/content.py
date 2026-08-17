from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.content import SuggestedTopic, VisaRoute
from app.schemas.content import SuggestedTopicOut, VisaRouteOut

router = APIRouter(tags=["content"])


@router.get("/topics", response_model=list[SuggestedTopicOut])
def list_topics(
    db: Session = Depends(get_db),
    practice: str = Query("immigration"),
    jurisdiction: str = Query("US"),
    locale: str = Query("en"),
    limit: int = Query(20, le=50),
) -> list[SuggestedTopicOut]:
    """Suggested-topic cards for the home screen, localised server-side."""
    rows = db.scalars(
        select(SuggestedTopic)
        .where(
            SuggestedTopic.is_published.is_(True),
            SuggestedTopic.practice == practice,
            or_(
                SuggestedTopic.jurisdiction == jurisdiction,
                SuggestedTopic.jurisdiction == "ALL",
            ),
        )
        .order_by(SuggestedTopic.sort_order)
        .limit(limit)
    ).all()
    es = locale == "es"
    return [
        SuggestedTopicOut(
            id=t.id,
            practice=t.practice,
            jurisdiction=t.jurisdiction,
            icon=t.icon,
            title=t.title_es if es else t.title_en,
            subtitle=t.subtitle_es if es else t.subtitle_en,
            prompt=(t.prompt_es if es else t.prompt_en) or (t.title_es if es else t.title_en),
        )
        for t in rows
    ]


@router.get("/visa-routes", response_model=list[VisaRouteOut])
def list_visa_routes(
    db: Session = Depends(get_db),
    jurisdiction: str | None = Query(None),
    locale: str = Query("en"),
) -> list[VisaRouteOut]:
    stmt = select(VisaRoute).where(VisaRoute.is_published.is_(True))
    if jurisdiction:
        stmt = stmt.where(VisaRoute.jurisdiction == jurisdiction)
    rows = db.scalars(stmt.order_by(VisaRoute.jurisdiction, VisaRoute.code)).all()
    es = locale == "es"
    return [
        VisaRouteOut(
            id=r.id,
            jurisdiction=r.jurisdiction,
            code=r.code,
            name=r.name_es if es else r.name_en,
            summary=r.summary_es if es else r.summary_en,
            typical_timeline=r.typical_timeline,
            specialties=r.specialties or [],
            official_url=r.official_url,
        )
        for r in rows
    ]
