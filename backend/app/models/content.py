from __future__ import annotations

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SuggestedTopic(Base):
    """The tappable cards under "Suggested Topics" on the home screen.

    Admin-editable so the team can retune the entry points without a deploy.
    """

    __tablename__ = "suggested_topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    # "immigration" | "tax"
    practice: Mapped[str] = mapped_column(String(16), default="immigration", index=True)
    # "US" | "EU" | "ES" | "UK" | "ALL"
    jurisdiction: Mapped[str] = mapped_column(String(4), default="ALL", index=True)
    icon: Mapped[str] = mapped_column(String(40), default="document-text")

    title_en: Mapped[str] = mapped_column(String(160))
    title_es: Mapped[str] = mapped_column(String(160))
    subtitle_en: Mapped[str] = mapped_column(String(200), default="")
    subtitle_es: Mapped[str] = mapped_column(String(200), default="")
    # Text dropped into the composer when the card is tapped.
    prompt_en: Mapped[str] = mapped_column(Text, default="")
    prompt_es: Mapped[str] = mapped_column(Text, default="")

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(default=True)


class VisaRoute(Base):
    """Reference catalogue of visa routes, used to ground the AI's suggestions."""

    __tablename__ = "visa_routes"

    id: Mapped[int] = mapped_column(primary_key=True)
    jurisdiction: Mapped[str] = mapped_column(String(4), index=True)
    code: Mapped[str] = mapped_column(String(40))          # "H-1B", "EU Blue Card"
    name_en: Mapped[str] = mapped_column(String(160))
    name_es: Mapped[str] = mapped_column(String(160))
    summary_en: Mapped[str] = mapped_column(Text, default="")
    summary_es: Mapped[str] = mapped_column(Text, default="")
    typical_timeline: Mapped[str] = mapped_column(String(120), default="")
    specialties: Mapped[list] = mapped_column(JSON, default=list)
    official_url: Mapped[str] = mapped_column(String(400), default="")
    is_published: Mapped[bool] = mapped_column(default=True)
