from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.user import utcnow


class Firm(Base):
    __tablename__ = "firms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    city: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(80), default="")
    website: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")

    lawyers: Mapped[list[Lawyer]] = relationship(back_populates="firm")


class Lawyer(Base):
    __tablename__ = "lawyers"

    id: Mapped[int] = mapped_column(primary_key=True)
    firm_id: Mapped[int | None] = mapped_column(ForeignKey("firms.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(160))
    headline: Mapped[str] = mapped_column(String(160), default="Immigration Lawyer")
    avatar_url: Mapped[str] = mapped_column(String(400), default="")
    bio: Mapped[str] = mapped_column(Text, default="")

    city: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(80), default="")
    # One of "US" | "EU" | "ES" | "UK" — where they are admitted/licensed to practise.
    jurisdiction: Mapped[str] = mapped_column(String(4), index=True)
    bar_admission: Mapped[str] = mapped_column(String(200), default="")

    # Practice areas this adviser covers: ["immigration"], ["tax"], or both.
    practices: Mapped[list] = mapped_column(JSON, default=lambda: ["immigration"])
    # JSON lists, e.g. ["work_visa", "asylum"] and ["en", "es"].
    specialties: Mapped[list] = mapped_column(JSON, default=list)
    languages: Mapped[list] = mapped_column(JSON, default=list)

    hourly_rate: Mapped[int] = mapped_column(Integer, default=100)
    currency: Mapped[str] = mapped_column(String(4), default="EUR")
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    years_experience: Mapped[int] = mapped_column(Integer, default=5)
    cases_count: Mapped[int] = mapped_column(Integer, default=0)

    email: Mapped[str] = mapped_column(String(255), default="")
    whatsapp: Mapped[str] = mapped_column(String(40), default="")
    offers_free_consult: Mapped[bool] = mapped_column(default=True)
    is_published: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    firm: Mapped[Firm | None] = relationship(back_populates="lawyers")
