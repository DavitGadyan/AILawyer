from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    lawyer_ids: list[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: int
    title: str
    practice: str = "immigration"
    jurisdiction: str
    locale: str
    created_at: datetime
    updated_at: datetime
    has_profile: bool = False

    model_config = {"from_attributes": True}


class SessionDetailOut(SessionOut):
    messages: list[MessageOut] = Field(default_factory=list)


class SessionCreateIn(BaseModel):
    practice: str = "immigration"
    jurisdiction: str = "US"
    locale: str = "en"
    title: str = "New consultation"


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=6000)
    session_id: int | None = None
    practice: str = "immigration"
    jurisdiction: str = "US"
    locale: str = "en"
    # Ask the backend to append matched lawyers to the assistant turn.
    want_lawyers: bool = True
