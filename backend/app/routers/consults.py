from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.case import CaseProfile, Consultation
from app.models.lawyer import Lawyer
from app.models.user import User
from app.schemas.lawyer import ConsultationIn, ConsultationOut
from app.security import get_current_user

router = APIRouter(prefix="/consultations", tags=["consultations"])

_INTRO = {
    "es": "Hola {name}, le escribo desde la aplicación AI Lawyer.",
    "en": "Hello {name}, I found you through the AI Lawyer app.",
}
_SUBJECT = {
    "es": "Solicitud de consulta de inmigración",
    "en": "Immigration consultation request",
}


@router.post("", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
def request_consultation(
    payload: ConsultationIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConsultationOut:
    """Record a booking intent and return prefilled WhatsApp / email deep links.

    The app opens one of these itself — we never contact the lawyer on the user's behalf,
    so the user always sees and controls exactly what is sent.
    """
    lawyer = db.get(Lawyer, payload.lawyer_id)
    if lawyer is None or not lawyer.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lawyer not found"
        )

    body = payload.message.strip()
    if not body and payload.session_id is not None:
        profile = db.scalar(
            select(CaseProfile).where(CaseProfile.session_id == payload.session_id)
        )
        if profile is not None and profile.user_id == user.id:
            body = profile.summary

    locale = user.locale if user.locale in _INTRO else "en"
    intro = _INTRO[locale].format(name=lawyer.name)
    full_message = f"{intro}\n\n{body}".strip() if body else intro

    consultation = Consultation(
        user_id=user.id,
        lawyer_id=lawyer.id,
        session_id=payload.session_id,
        channel=payload.channel,
        message=full_message,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    phone = "".join(ch for ch in lawyer.whatsapp if ch.isdigit())
    subject = quote(_SUBJECT[locale])
    return ConsultationOut(
        id=consultation.id,
        lawyer_id=lawyer.id,
        channel=consultation.channel,
        status=consultation.status,
        whatsapp_url=(
            f"https://wa.me/{phone}?text={quote(full_message)}" if phone else ""
        ),
        mailto_url=(
            f"mailto:{lawyer.email}?subject={subject}&body={quote(full_message)}"
            if lawyer.email
            else ""
        ),
    )
