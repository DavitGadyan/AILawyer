from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.case import CaseProfile, ChatSession, Consultation, Message, TaxProfile
from app.models.forum import Post, Report, Thread
from app.models.lawyer import Lawyer
from app.models.user import User, UserRole
from app.schemas.auth import UserOut
from app.schemas.content import StatsOut, SuggestedTopicWriteIn
from app.schemas.forum import ReportOut
from app.schemas.lawyer import LawyerOut, LawyerWriteIn
from app.security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# --------------------------------------------------------------------------- #
# Lawyers
# --------------------------------------------------------------------------- #
@router.get("/lawyers", response_model=list[LawyerOut])
def admin_list_lawyers(db: Session = Depends(get_db)) -> list[LawyerOut]:
    """Unlike the public list, this includes unpublished entries."""
    rows = db.scalars(select(Lawyer).order_by(Lawyer.id)).all()
    return [LawyerOut.model_validate(r) for r in rows]


@router.post("/lawyers", response_model=LawyerOut, status_code=status.HTTP_201_CREATED)
def admin_create_lawyer(
    payload: LawyerWriteIn, db: Session = Depends(get_db)
) -> LawyerOut:
    lawyer = Lawyer(**payload.model_dump())
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    return LawyerOut.model_validate(lawyer)


@router.put("/lawyers/{lawyer_id}", response_model=LawyerOut)
def admin_update_lawyer(
    lawyer_id: int, payload: LawyerWriteIn, db: Session = Depends(get_db)
) -> LawyerOut:
    lawyer = db.get(Lawyer, lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    for key, value in payload.model_dump().items():
        setattr(lawyer, key, value)
    db.commit()
    db.refresh(lawyer)
    return LawyerOut.model_validate(lawyer)


@router.delete("/lawyers/{lawyer_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_lawyer(lawyer_id: int, db: Session = Depends(get_db)) -> None:
    lawyer = db.get(Lawyer, lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    db.delete(lawyer)
    db.commit()


# --------------------------------------------------------------------------- #
# Suggested topics
# --------------------------------------------------------------------------- #
@router.get("/topics")
def admin_list_topics(db: Session = Depends(get_db)) -> list[dict]:
    from app.models.content import SuggestedTopic

    rows = db.scalars(select(SuggestedTopic).order_by(SuggestedTopic.sort_order)).all()
    return [
        {
            "id": t.id,
            "practice": t.practice,
            "jurisdiction": t.jurisdiction,
            "icon": t.icon,
            "title_en": t.title_en,
            "title_es": t.title_es,
            "subtitle_en": t.subtitle_en,
            "subtitle_es": t.subtitle_es,
            "prompt_en": t.prompt_en,
            "prompt_es": t.prompt_es,
            "sort_order": t.sort_order,
            "is_published": t.is_published,
        }
        for t in rows
    ]


@router.post("/topics", status_code=status.HTTP_201_CREATED)
def admin_create_topic(
    payload: SuggestedTopicWriteIn, db: Session = Depends(get_db)
) -> dict:
    from app.models.content import SuggestedTopic

    topic = SuggestedTopic(**payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return {"id": topic.id}


@router.put("/topics/{topic_id}")
def admin_update_topic(
    topic_id: int, payload: SuggestedTopicWriteIn, db: Session = Depends(get_db)
) -> dict:
    from app.models.content import SuggestedTopic

    topic = db.get(SuggestedTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    for key, value in payload.model_dump().items():
        setattr(topic, key, value)
    db.commit()
    return {"id": topic.id}


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_topic(topic_id: int, db: Session = Depends(get_db)) -> None:
    from app.models.content import SuggestedTopic

    topic = db.get(SuggestedTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()


# --------------------------------------------------------------------------- #
# Moderation
# --------------------------------------------------------------------------- #
@router.get("/reports", response_model=list[ReportOut])
def admin_list_reports(
    db: Session = Depends(get_db), status_filter: str = Query("open", alias="status")
) -> list[ReportOut]:
    stmt = select(Report)
    if status_filter != "all":
        stmt = stmt.where(Report.status == status_filter)
    reports = db.scalars(stmt.order_by(Report.created_at.desc())).all()

    out: list[ReportOut] = []
    for r in reports:
        excerpt = ""
        if r.post_id:
            post = db.get(Post, r.post_id)
            excerpt = (post.body[:200] if post else "[deleted]")
        elif r.thread_id:
            thread = db.get(Thread, r.thread_id)
            excerpt = (f"{thread.title} — {thread.body[:160]}" if thread else "[deleted]")
        out.append(
            ReportOut(
                id=r.id,
                thread_id=r.thread_id,
                post_id=r.post_id,
                reason=r.reason,
                status=r.status,
                created_at=r.created_at,
                excerpt=excerpt,
            )
        )
    return out


@router.post("/reports/{report_id}/resolve")
def admin_resolve_report(
    report_id: int,
    hide_content: bool = Query(False),
    db: Session = Depends(get_db),
) -> dict:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if hide_content:
        if report.post_id:
            post = db.get(Post, report.post_id)
            if post:
                post.is_hidden = True
        if report.thread_id:
            thread = db.get(Thread, report.thread_id)
            if thread:
                thread.is_hidden = True
    report.status = "resolved"
    db.commit()
    return {"id": report.id, "status": report.status}


@router.post("/threads/{thread_id}/lock")
def admin_lock_thread(
    thread_id: int, locked: bool = Query(True), db: Session = Depends(get_db)
) -> dict:
    thread = db.get(Thread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.is_locked = locked
    db.commit()
    return {"id": thread.id, "is_locked": thread.is_locked}


# --------------------------------------------------------------------------- #
# Users + stats
# --------------------------------------------------------------------------- #
@router.get("/users", response_model=list[UserOut])
def admin_list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    users = db.scalars(select(User).order_by(User.id)).all()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            locale=u.locale,
            accepted_disclaimer=u.accepted_disclaimer,
        )
        for u in users
    ]


@router.post("/users/{user_id}/role", response_model=UserOut)
def admin_set_role(user_id: int, role: str, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown role: {role}") from None
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        locale=user.locale,
        accepted_disclaimer=user.accepted_disclaimer,
    )


@router.get("/stats", response_model=StatsOut)
def admin_stats(db: Session = Depends(get_db)) -> StatsOut:
    def count(model) -> int:
        return db.scalar(select(func.count()).select_from(model)) or 0

    by_jurisdiction = db.execute(
        select(ChatSession.jurisdiction, func.count(ChatSession.id))
        .group_by(ChatSession.jurisdiction)
        .order_by(func.count(ChatSession.id).desc())
    ).all()

    return StatsOut(
        users=count(User),
        lawyers=count(Lawyer),
        chat_sessions=count(ChatSession),
        messages=count(Message),
        case_profiles=count(CaseProfile),
        tax_profiles=count(TaxProfile),
        consultations=count(Consultation),
        threads=count(Thread),
        posts=count(Post),
        open_reports=db.scalar(
            select(func.count(Report.id)).where(Report.status == "open")
        ) or 0,
        top_jurisdictions=[{"jurisdiction": j, "sessions": c} for j, c in by_jurisdiction],
    )
