from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.forum import Category, Post, Report, Thread
from app.models.user import User, UserRole, utcnow
from app.schemas.forum import (
    AuthorOut,
    CategoryOut,
    PostCreateIn,
    PostOut,
    ReportIn,
    ThreadCreateIn,
    ThreadDetailOut,
    ThreadOut,
)
from app.security import get_current_user
from app.services.moderation import check_post

router = APIRouter(prefix="/forum", tags=["forum"])


def _author(db: Session, user_id: int) -> AuthorOut:
    user = db.get(User, user_id)
    if user is None:
        return AuthorOut(id=0, full_name="Deleted user", role="client")
    return AuthorOut(id=user.id, full_name=user.full_name or "Member", role=user.role.value)


def _thread_out(db: Session, thread: Thread, reply_count: int | None = None) -> ThreadOut:
    if reply_count is None:
        reply_count = db.scalar(
            select(func.count(Post.id)).where(
                Post.thread_id == thread.id, Post.is_hidden.is_(False)
            )
        ) or 0
    return ThreadOut(
        id=thread.id,
        category_id=thread.category_id,
        title=thread.title,
        body=thread.body,
        is_locked=thread.is_locked,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        author=_author(db, thread.author_id),
        reply_count=reply_count,
    )


async def _moderate_or_400(text: str) -> None:
    verdict = await check_post(text)
    if not verdict.allow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=verdict.reason or "This post breaks the community guidelines.",
        )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db), locale: str = Query("en")
) -> list[CategoryOut]:
    categories = db.scalars(select(Category).order_by(Category.sort_order)).all()
    counts = dict(
        db.execute(
            select(Thread.category_id, func.count(Thread.id))
            .where(Thread.is_hidden.is_(False))
            .group_by(Thread.category_id)
        ).all()
    )
    es = locale == "es"
    return [
        CategoryOut(
            id=c.id,
            slug=c.slug,
            name=c.name_es if es else c.name_en,
            description=c.description_es if es else c.description_en,
            icon=c.icon,
            thread_count=counts.get(c.id, 0),
        )
        for c in categories
    ]


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(
    db: Session = Depends(get_db),
    category_id: int | None = Query(None),
    q: str = Query(""),
    limit: int = Query(50, le=100),
) -> list[ThreadOut]:
    stmt = select(Thread).where(Thread.is_hidden.is_(False))
    if category_id is not None:
        stmt = stmt.where(Thread.category_id == category_id)
    if q:
        stmt = stmt.where(Thread.title.ilike(f"%{q}%"))
    threads = db.scalars(stmt.order_by(Thread.updated_at.desc()).limit(limit)).all()
    return [_thread_out(db, t) for t in threads]


@router.post("/threads", response_model=ThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ThreadCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ThreadOut:
    if db.get(Category, payload.category_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    await _moderate_or_400(f"{payload.title}\n\n{payload.body}")

    thread = Thread(
        category_id=payload.category_id,
        author_id=user.id,
        title=payload.title,
        body=payload.body,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return _thread_out(db, thread, reply_count=0)


@router.get("/threads/{thread_id}", response_model=ThreadDetailOut)
def get_thread(thread_id: int, db: Session = Depends(get_db)) -> ThreadDetailOut:
    thread = db.get(Thread, thread_id)
    if thread is None or thread.is_hidden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found"
        )
    posts = [p for p in thread.posts if not p.is_hidden]
    base = _thread_out(db, thread, reply_count=len(posts))
    return ThreadDetailOut(
        **base.model_dump(),
        posts=[
            PostOut(
                id=p.id,
                body=p.body,
                created_at=p.created_at,
                author=_author(db, p.author_id),
            )
            for p in posts
        ],
    )


@router.post(
    "/threads/{thread_id}/posts",
    response_model=PostOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    thread_id: int,
    payload: PostCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostOut:
    thread = db.get(Thread, thread_id)
    if thread is None or thread.is_hidden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found"
        )
    if thread.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This thread is locked."
        )
    await _moderate_or_400(payload.body)

    post = Post(thread_id=thread_id, author_id=user.id, body=payload.body)
    db.add(post)
    # Bump the thread so active discussions float to the top of the list.
    thread.updated_at = utcnow()
    db.commit()
    db.refresh(post)
    return PostOut(
        id=post.id,
        body=post.body,
        created_at=post.created_at,
        author=_author(db, post.author_id),
    )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != user.id and user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your post."
        )
    db.delete(post)
    db.commit()


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def report(
    payload: ReportIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if payload.thread_id is None and payload.post_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either thread_id or post_id.",
        )
    db.add(
        Report(
            reporter_id=user.id,
            thread_id=payload.thread_id,
            post_id=payload.post_id,
            reason=payload.reason,
        )
    )
    db.commit()
    return {"status": "received"}
