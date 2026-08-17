from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.user import utcnow


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="New consultation")
    # "immigration" | "tax" — selects the system prompt and the analysis shape.
    practice: Mapped[str] = mapped_column(String(16), default="immigration", index=True)
    # "US" | "EU" | "ES" | "UK" — chosen on the home screen, steers the system prompt.
    jurisdiction: Mapped[str] = mapped_column(String(4), default="US")
    locale: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    messages: Mapped[list[Message]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.id",
    )
    profile: Mapped[CaseProfile | None] = relationship(
        back_populates="session", cascade="all, delete-orphan", uselist=False
    )
    tax_profile: Mapped[TaxProfile | None] = relationship(
        back_populates="session", cascade="all, delete-orphan", uselist=False
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id"), index=True
    )
    role: Mapped[str] = mapped_column(String(16))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    # Lawyer ids surfaced alongside an assistant turn, rendered as the inline carousel.
    lawyer_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    session: Mapped[ChatSession] = relationship(back_populates="messages")


class CaseProfile(Base):
    """Structured triage output — one per chat session."""

    __tablename__ = "case_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id"), unique=True, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    nationality: Mapped[str] = mapped_column(String(120), default="")
    current_country: Mapped[str] = mapped_column(String(120), default="")
    target_jurisdiction: Mapped[str] = mapped_column(String(4), default="US")
    current_status: Mapped[str] = mapped_column(String(200), default="")
    goal: Mapped[str] = mapped_column(Text, default="")
    urgency: Mapped[str] = mapped_column(String(10), default="medium")
    dependents: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")

    key_facts: Mapped[list] = mapped_column(JSON, default=list)
    recommended_routes: Mapped[list] = mapped_column(JSON, default=list)
    suggested_specialties: Mapped[list] = mapped_column(JSON, default=list)
    red_flags: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    session: Mapped[ChatSession] = relationship(back_populates="profile")
    checklist: Mapped[list[ChecklistItem]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", order_by="ChecklistItem.id"
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("case_profiles.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    why: Mapped[str] = mapped_column(Text, default="")
    mandatory: Mapped[bool] = mapped_column(default=True)
    is_done: Mapped[bool] = mapped_column(default=False)

    profile: Mapped[CaseProfile] = relationship(back_populates="checklist")


# --------------------------------------------------------------------------- #
# Tax & corporate structuring
# --------------------------------------------------------------------------- #
class TaxProfile(Base):
    """Structured structuring analysis — one per chat session.

    The tax counterpart to CaseProfile. The shape differs enough from immigration
    (a group of entities rather than a ranked list of routes) to warrant its own
    tables rather than overloading the visa ones.
    """

    __tablename__ = "tax_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id"), unique=True, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    residence_country: Mapped[str] = mapped_column(String(120), default="")
    primary_jurisdiction: Mapped[str] = mapped_column(String(4), default="UK")
    business_activity: Mapped[str] = mapped_column(Text, default="")
    revenue_flow: Mapped[str] = mapped_column(Text, default="")
    goal: Mapped[str] = mapped_column(Text, default="")
    complexity: Mapped[str] = mapped_column(String(10), default="medium")
    summary: Mapped[str] = mapped_column(Text, default="")
    structure_rationale: Mapped[str] = mapped_column(Text, default="")
    estimated_setup_cost: Mapped[str] = mapped_column(String(120), default="")
    estimated_annual_cost: Mapped[str] = mapped_column(String(120), default="")

    current_entities: Mapped[list] = mapped_column(JSON, default=list)
    key_facts: Mapped[list] = mapped_column(JSON, default=list)
    alternatives: Mapped[list] = mapped_column(JSON, default=list)
    suggested_specialties: Mapped[list] = mapped_column(JSON, default=list)
    red_flags: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    session: Mapped[ChatSession] = relationship(back_populates="tax_profile")
    entities: Mapped[list[StructureEntity]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="StructureEntity.id",
    )
    risks: Mapped[list[TaxRisk]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", order_by="TaxRisk.id"
    )
    compliance: Mapped[list[ComplianceItem]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="ComplianceItem.id",
    )


class StructureEntity(Base):
    """One company in the proposed group. `owned_by` is empty for the top holding entity."""

    __tablename__ = "structure_entities"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tax_profiles.id"), index=True)

    name: Mapped[str] = mapped_column(String(160))
    entity_type: Mapped[str] = mapped_column(String(160), default="")
    jurisdiction: Mapped[str] = mapped_column(String(4), default="UK")
    role: Mapped[str] = mapped_column(String(16), default="trading")
    owned_by: Mapped[str] = mapped_column(String(160), default="")
    ownership_pct: Mapped[int] = mapped_column(Integer, default=100)
    rationale: Mapped[str] = mapped_column(Text, default="")
    tax_treatment: Mapped[str] = mapped_column(Text, default="")
    setup_cost: Mapped[str] = mapped_column(String(120), default="")
    annual_cost: Mapped[str] = mapped_column(String(120), default="")

    profile: Mapped[TaxProfile] = relationship(back_populates="entities")


class TaxRisk(Base):
    __tablename__ = "tax_risks"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tax_profiles.id"), index=True)

    title: Mapped[str] = mapped_column(String(240))
    category: Mapped[str] = mapped_column(String(40), default="other")
    severity: Mapped[str] = mapped_column(String(10), default="medium")
    explanation: Mapped[str] = mapped_column(Text, default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")

    profile: Mapped[TaxProfile] = relationship(back_populates="risks")


class ComplianceItem(Base):
    """A recurring filing obligation the proposed structure creates."""

    __tablename__ = "compliance_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tax_profiles.id"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    jurisdiction: Mapped[str] = mapped_column(String(4), default="UK")
    frequency: Mapped[str] = mapped_column(String(40), default="annual")
    deadline: Mapped[str] = mapped_column(String(120), default="")
    why: Mapped[str] = mapped_column(Text, default="")
    mandatory: Mapped[bool] = mapped_column(default=True)
    is_done: Mapped[bool] = mapped_column(default=False)

    profile: Mapped[TaxProfile] = relationship(back_populates="compliance")


class Consultation(Base):
    """A booking handoff to a human lawyer (email / WhatsApp)."""

    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lawyer_id: Mapped[int] = mapped_column(ForeignKey("lawyers.id"), index=True)
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_sessions.id"), nullable=True
    )
    channel: Mapped[str] = mapped_column(String(16), default="email")  # email | whatsapp
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="requested")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
