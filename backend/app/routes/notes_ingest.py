"""Ingest endpoint for notes mirrored in from the w_notes app.

The portfolio's own post routes authenticate a human via a Firebase ID token,
which a backend service has no way to mint. Rather than weaken those routes or
fake a user session, machine-to-machine ingest gets its own narrow endpoint with
its own credential and a hard-coded blast radius: it can only ever touch posts
in the ``notes`` category carrying ``source='w_notes'``.

Idempotency comes from the ``(source, source_id)`` unique index — publishing an
edited note updates the post it created the first time instead of piling up
duplicates. The post's ``date`` is set from the note's ``updated_at``, which is
what floats a freshly-edited note back to the top of the site's feed.

Security notes:
- The shared secret is compared with :func:`secrets.compare_digest`; a plain
  ``==`` on a secret leaks its prefix through response timing.
- Note bodies are rich-text HTML authored in an external app and rendered
  verbatim by the site, so they are sanitized *here*, on arrival. This is the
  boundary where untrusted markup enters the system that renders it.
"""

import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Optional

import nh3
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.post import Post
from app.routes.posts import generate_unique_slug

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notes", tags=["notes-ingest"])

# Every post this endpoint creates is pinned to these. Ingest can never reach a
# post authored in the admin UI, whatever it is asked to do.
SOURCE = "w_notes"
CATEGORY = "notes"

# The tag set the w_notes rich editor actually emits (a TipTap subset shared by
# its native and web editors), and nothing else. Anything outside this list is
# stripped rather than escaped, so unexpected markup degrades to its text.
ALLOWED_TAGS = {
    "p", "br", "hr",
    "b", "strong", "i", "em", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title"},
    # The checkbox-list dialect: `<ul data-type="checkbox">` with `<li checked>`.
    # Preserved so task lists render as task lists on the site.
    "ul": {"data-type"},
    "li": {"checked"},
}

# Anchors are rewritten to carry these, so a link in a note can't reach back into
# the referring page via `window.opener` and can't leak the URL as a referrer.
LINK_RELS = {"noopener", "noreferrer", "nofollow"}


def sanitize_body(html: str) -> str:
    """Strip the note body down to the known-safe rich-text subset.

    nh3 drops disallowed tags, every attribute outside the allowlist (so no
    ``onclick``/``style``), and any URL scheme outside the safe set — which is
    what neutralizes ``javascript:`` hrefs.
    """
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        link_rel=" ".join(sorted(LINK_RELS)),
        url_schemes={"http", "https", "mailto"},
    )


def require_ingest_secret(x_ingest_secret: Optional[str] = Header(default=None)) -> None:
    """Authenticate the calling service.

    Fails closed: an unset ``NOTES_INGEST_SECRET`` disables the endpoint outright
    rather than leaving it open. Otherwise a deploy that forgot the variable
    would silently expose a public write endpoint.
    """
    expected = os.getenv("NOTES_INGEST_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail="Note ingest is not configured")
    if not x_ingest_secret or not secrets.compare_digest(x_ingest_secret, expected):
        raise HTTPException(status_code=401, detail="Invalid ingest credentials")


class NoteIngest(BaseModel):
    source_id: str = Field(..., max_length=255, description="The w_notes note id")
    title: str = Field(..., max_length=255)
    body_html: str = Field(default="", description="Rich-text HTML, sanitized on arrival")
    album: str = Field(default="notes", max_length=100)
    is_favorite: bool = False
    updated_at_ms: int = Field(..., description="Note updated_at, epoch ms")
    created_at_ms: int = Field(..., description="Note created_at, epoch ms")


def _to_datetime(epoch_ms: int) -> datetime:
    """Epoch ms -> naive UTC datetime, matching how other posts store dates."""
    return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).replace(tzinfo=None)


@router.post("/ingest", dependencies=[Depends(require_ingest_secret)])
async def ingest_note(payload: NoteIngest, db: Session = Depends(get_db)):
    """Create or update the post mirroring a published note."""
    body = sanitize_body(payload.body_html)
    title = payload.title.strip() or "Untitled note"

    post = (
        db.query(Post)
        .filter(Post.source == SOURCE, Post.source_id == payload.source_id)
        .first()
    )

    if post is None:
        post = Post(
            source=SOURCE,
            source_id=payload.source_id,
            category=CATEGORY,
            slug=generate_unique_slug(title, db),
            # Text posts store their content inline rather than as an S3 URL;
            # the feed treats a non-http content_url as text (see Feed.tsx).
            # thumbnail_url is NOT NULL, and empty is what marks "no image".
            content_url=body,
            thumbnail_url="",
            post_type="text",
            created_at=_to_datetime(payload.created_at_ms),
        )
        db.add(post)
    elif post.title != title:
        # Only re-slug when the title actually changed — a note edited ten times
        # should keep one stable URL rather than shedding a new one each save.
        post.slug = generate_unique_slug(title, db, existing_post_id=post.id)

    post.title = title
    post.content_url = body
    post.album = payload.album or "notes"
    post.is_favorite = payload.is_favorite
    # Sorting key for the feed: an edit republishes the note to the top.
    post.date = _to_datetime(payload.updated_at_ms)
    post.is_active = True

    db.commit()
    db.refresh(post)
    return {"id": str(post.id), "slug": post.slug, "status": "ok"}


@router.delete("/ingest/{source_id}", dependencies=[Depends(require_ingest_secret)])
async def unpublish_note(source_id: str, db: Session = Depends(get_db)):
    """Remove the post for a note that was unpublished or trashed.

    Deliberately does not reuse ``delete_post``: that helper best-effort deletes
    ``content_url`` from S3, and for a note that field holds the body's HTML, not
    an object key. There is nothing in S3 to clean up here.
    """
    post = (
        db.query(Post)
        .filter(Post.source == SOURCE, Post.source_id == source_id)
        .first()
    )
    if not post:
        # Normal whenever an already-unpublished note is edited; the caller
        # treats 404 on delete as success.
        raise HTTPException(status_code=404, detail="No published post for this note")

    db.delete(post)
    db.commit()
    return {"status": "deleted"}
