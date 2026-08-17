from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    icon: str
    thread_count: int = 0


class AuthorOut(BaseModel):
    id: int
    full_name: str
    role: str


class PostOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    author: AuthorOut


class ThreadOut(BaseModel):
    id: int
    category_id: int
    title: str
    body: str
    is_locked: bool
    created_at: datetime
    updated_at: datetime
    author: AuthorOut
    reply_count: int = 0


class ThreadDetailOut(ThreadOut):
    posts: list[PostOut] = Field(default_factory=list)


class ThreadCreateIn(BaseModel):
    category_id: int
    title: str = Field(min_length=5, max_length=240)
    body: str = Field(min_length=10, max_length=8000)


class PostCreateIn(BaseModel):
    body: str = Field(min_length=2, max_length=8000)


class ReportIn(BaseModel):
    thread_id: int | None = None
    post_id: int | None = None
    reason: str = Field(default="", max_length=400)


class ReportOut(BaseModel):
    id: int
    thread_id: int | None
    post_id: int | None
    reason: str
    status: str
    created_at: datetime
    excerpt: str = ""

    model_config = {"from_attributes": True}
