from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models.case import CaseProfile, ChatSession, Message, TaxProfile
from app.models.lawyer import Lawyer
from app.models.user import User
from app.schemas.chat import (
    ChatIn,
    MessageOut,
    SessionCreateIn,
    SessionDetailOut,
    SessionOut,
)
from app.schemas.lawyer import LawyerOut
from app.security import get_current_user
from app.services import chat_service
from app.services.matching import rank_lawyers
from app.services.openai_client import require_ai
from app.services.rate_limit import enforce_chat_limit

router = APIRouter(prefix="/chat", tags=["chat"])

# Phrases that mean "show me a professional", in both supported languages.
_LAWYER_INTENT = (
    "lawyer", "attorney", "solicitor", "counsel", "represent", "hire", "book",
    "consultation", "abogad", "letrad", "consulta", "contratar",
    # tax-side vocabulary
    "adviser", "advisor", "accountant", "cpa", "asesor", "contable", "gestor",
)


def _wants_lawyers(text: str) -> bool:
    lowered = text.lower()
    return any(token in lowered for token in _LAWYER_INTENT)


def _session_or_404(db: Session, session_id: int, user: User) -> ChatSession:
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
        )
    return session


def _matched_lawyers(db: Session, session: ChatSession, limit: int = 4) -> list[Lawyer]:
    """Rank against whichever analysis exists for this session's practice area."""
    specialties: list[str] = []
    jurisdiction = session.jurisdiction

    if session.practice == "tax":
        tax_profile = db.scalar(
            select(TaxProfile).where(TaxProfile.session_id == session.id)
        )
        if tax_profile:
            specialties = list(tax_profile.suggested_specialties or [])
            jurisdiction = tax_profile.primary_jurisdiction
    else:
        profile = db.scalar(
            select(CaseProfile).where(CaseProfile.session_id == session.id)
        )
        if profile:
            specialties = list(profile.suggested_specialties or [])
            jurisdiction = profile.target_jurisdiction

    pool = list(db.scalars(select(Lawyer).where(Lawyer.is_published.is_(True))))
    ranked = rank_lawyers(
        pool, jurisdiction, specialties, session.locale, limit, session.practice
    )
    return [r.lawyer for r in ranked]


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[SessionOut]:
    sessions = db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
    ).all()
    profile_ids = set(
        db.scalars(select(CaseProfile.session_id).where(CaseProfile.user_id == user.id))
    ) | set(
        db.scalars(select(TaxProfile.session_id).where(TaxProfile.user_id == user.id))
    )
    return [
        SessionOut(
            id=s.id,
            title=s.title,
            practice=s.practice,
            jurisdiction=s.jurisdiction,
            locale=s.locale,
            created_at=s.created_at,
            updated_at=s.updated_at,
            has_profile=s.id in profile_ids,
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    session = ChatSession(
        user_id=user.id,
        title=payload.title,
        practice=payload.practice,
        jurisdiction=payload.jurisdiction,
        locale=payload.locale,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    session = _session_or_404(db, session_id, user)
    model = TaxProfile if session.practice == "tax" else CaseProfile
    has_profile = (
        db.scalar(select(model.id).where(model.session_id == session.id)) is not None
    )
    return SessionDetailOut(
        id=session.id,
        title=session.title,
        practice=session.practice,
        jurisdiction=session.jurisdiction,
        locale=session.locale,
        created_at=session.created_at,
        updated_at=session.updated_at,
        has_profile=has_profile,
        messages=[MessageOut.model_validate(m) for m in session.messages],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    session = _session_or_404(db, session_id, user)
    db.delete(session)
    db.commit()


@router.post("/stream")
async def stream_chat(
    payload: ChatIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an assistant reply as server-sent events.

    Frames: {"type":"session",...} once, then many {"type":"delta","text":...},
    optionally {"type":"lawyers","lawyers":[...]}, and finally {"type":"done",...}.
    """
    require_ai()
    enforce_chat_limit(user.id)

    if payload.session_id is None:
        session = ChatSession(
            user_id=user.id,
            title=chat_service._fallback_title(payload.message),
            practice=payload.practice,
            jurisdiction=payload.jurisdiction,
            locale=payload.locale,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        is_first_turn = True
    else:
        session = _session_or_404(db, payload.session_id, user)
        session.practice = payload.practice
        session.jurisdiction = payload.jurisdiction
        session.locale = payload.locale
        is_first_turn = len(session.messages) == 0
        db.commit()

    session_id = session.id
    history = list(session.messages)
    user_message = payload.message
    practice = payload.practice
    jurisdiction = payload.jurisdiction
    locale = payload.locale
    show_lawyers = payload.want_lawyers and _wants_lawyers(user_message)

    async def event_stream() -> AsyncGenerator[str, None]:
        yield chat_service.sse("session", {"session_id": session_id})

        final_text = ""
        errored = False
        async for kind, value in chat_service.stream_reply(
            history, user_message, jurisdiction, locale, practice
        ):
            if kind == "delta":
                yield chat_service.sse("delta", {"text": value})
            elif kind == "error":
                errored = True
                yield chat_service.sse("error", {"message": value})
            elif kind == "done":
                final_text = value

        if errored:
            return

        # Persist the exchange on a fresh session — the request-scoped one may already
        # be closing by the time the stream drains.
        with SessionLocal() as write_db:
            live = write_db.get(ChatSession, session_id)
            if live is None:
                return
            write_db.add(
                Message(session_id=session_id, role="user", content=user_message)
            )

            lawyer_ids: list[int] = []
            lawyer_payload: list[dict] = []
            if show_lawyers:
                matches = _matched_lawyers(write_db, live)
                lawyer_ids = [m.id for m in matches]
                lawyer_payload = [
                    LawyerOut.model_validate(m).model_dump(mode="json") for m in matches
                ]

            write_db.add(
                Message(
                    session_id=session_id,
                    role="assistant",
                    content=final_text,
                    lawyer_ids=lawyer_ids,
                )
            )

            if is_first_turn:
                live.title = await chat_service.generate_title(user_message, locale)
            write_db.commit()
            title = live.title

        if lawyer_payload:
            yield chat_service.sse("lawyers", {"lawyers": lawyer_payload})
        yield chat_service.sse("done", {"text": final_text, "title": title})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Stop nginx/proxies from buffering the stream.
            "X-Accel-Buffering": "no",
        },
    )
