from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.user import utcnow


class Category(Base):
    __tablename__ = "forum_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(120))
    name_es: Mapped[str] = mapped_column(String(120))
    description_en: Mapped[str] = mapped_column(Text, default="")
    description_es: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(40), default="chatbubbles")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    threads: Mapped[list[Thread]] = relationship(back_populates="category")


class Thread(Base):
    __tablename__ = "forum_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("forum_categories.id"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    is_locked: Mapped[bool] = mapped_column(default=False)
    is_hidden: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    category: Mapped[Category] = relationship(back_populates="threads")
    posts: Mapped[list[Post]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", order_by="Post.id"
    )


class Post(Base):
    __tablename__ = "forum_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("forum_threads.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    is_hidden: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    thread: Mapped[Thread] = relationship(back_populates="posts")


class Report(Base):
    """A user flagging a thread or post; surfaces in the admin moderation queue."""

    __tablename__ = "forum_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    thread_id: Mapped[int | None] = mapped_column(
        ForeignKey("forum_threads.id"), nullable=True
    )
    post_id: Mapped[int | None] = mapped_column(
        ForeignKey("forum_posts.id"), nullable=True
    )
    reason: Mapped[str] = mapped_column(String(400), default="")
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
