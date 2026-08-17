from __future__ import annotations

from pydantic import BaseModel, Field


class FirmOut(BaseModel):
    id: int
    name: str
    city: str
    country: str
    website: str

    model_config = {"from_attributes": True}


class LawyerOut(BaseModel):
    id: int
    name: str
    headline: str
    avatar_url: str
    bio: str
    city: str
    country: str
    jurisdiction: str
    bar_admission: str
    practices: list[str]
    specialties: list[str]
    languages: list[str]
    hourly_rate: int
    currency: str
    rating: float
    reviews_count: int
    years_experience: int
    cases_count: int
    email: str
    whatsapp: str
    offers_free_consult: bool
    firm: FirmOut | None = None

    model_config = {"from_attributes": True}


class LawyerMatchOut(LawyerOut):
    """A lawyer plus the explanation of why the matcher picked them."""

    match_score: int
    match_reasons: list[str]


class LawyerWriteIn(BaseModel):
    """Admin create/update payload."""

    name: str = Field(min_length=2, max_length=160)
    headline: str = "Immigration Lawyer"
    avatar_url: str = ""
    bio: str = ""
    city: str = ""
    country: str = ""
    jurisdiction: str = "US"
    bar_admission: str = ""
    practices: list[str] = Field(default_factory=lambda: ["immigration"])
    specialties: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    hourly_rate: int = 100
    currency: str = "EUR"
    rating: float = 4.5
    reviews_count: int = 0
    years_experience: int = 5
    cases_count: int = 0
    email: str = ""
    whatsapp: str = ""
    offers_free_consult: bool = True
    is_published: bool = True
    firm_id: int | None = None


class MatchIn(BaseModel):
    """Match against an existing analysis profile, or against ad-hoc criteria."""

    profile_id: int | None = None
    practice: str = "immigration"
    jurisdiction: str | None = None
    specialties: list[str] = Field(default_factory=list)
    locale: str = "en"
    limit: int = 5


class ConsultationIn(BaseModel):
    lawyer_id: int
    channel: str = "email"  # email | whatsapp
    session_id: int | None = None
    message: str = ""


class ConsultationOut(BaseModel):
    id: int
    lawyer_id: int
    channel: str
    status: str
    # Ready-to-open deep links, prefilled with the case summary.
    whatsapp_url: str
    mailto_url: str
