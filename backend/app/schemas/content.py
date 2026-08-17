from __future__ import annotations

from pydantic import BaseModel, Field


class SuggestedTopicOut(BaseModel):
    """Localised for the requesting client — the app never sees both languages."""

    id: int
    practice: str
    jurisdiction: str
    icon: str
    title: str
    subtitle: str
    prompt: str


class SuggestedTopicWriteIn(BaseModel):
    practice: str = "immigration"
    jurisdiction: str = "ALL"
    icon: str = "document-text"
    title_en: str = Field(min_length=2, max_length=160)
    title_es: str = Field(min_length=2, max_length=160)
    subtitle_en: str = ""
    subtitle_es: str = ""
    prompt_en: str = ""
    prompt_es: str = ""
    sort_order: int = 0
    is_published: bool = True


class VisaRouteOut(BaseModel):
    id: int
    jurisdiction: str
    code: str
    name: str
    summary: str
    typical_timeline: str
    specialties: list[str]
    official_url: str


class StatsOut(BaseModel):
    users: int
    lawyers: int
    chat_sessions: int
    messages: int
    case_profiles: int
    tax_profiles: int
    consultations: int
    threads: int
    posts: int
    open_reports: int
    top_jurisdictions: list[dict]
