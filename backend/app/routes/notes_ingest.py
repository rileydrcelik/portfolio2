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

import httpx
import nh3
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.post import Post
from app.schemas.post import PostResponse
from app.routes.posts import generate_unique_slug
from app.lib.firebase_auth import verify_firebase_token

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
    """Refresh the post(s) embedding this note.

    **Update-only.** Where a note gets placed — which subject, which album — is
    decided in the portfolio admin, not in the notes app, so this never creates
    a post. A note that has not been embedded anywhere simply has nothing to
    update, and w_notes pushes every edit without knowing which notes are on the
    site; creating here would put unplaced notes on the site behind your back.

    A note can be embedded in more than one place, so every matching post is
    refreshed.
    """
    posts = (
        db.query(Post)
        .filter(Post.source == SOURCE, Post.source_id == payload.source_id)
        .all()
    )
    if not posts:
        # The overwhelmingly common case: an edit to a note nobody embedded.
        # 404 rather than an error — the caller treats it as "nothing to do".
        raise HTTPException(status_code=404, detail="Note is not embedded anywhere")

    body = sanitize_body(payload.body_html)
    title = payload.title.strip() or "Untitled note"

    for post in posts:
        if post.title != title:
            # Only re-slug when the title actually changed — a note edited ten
            # times should keep one stable URL, not shed a new one each save.
            post.slug = generate_unique_slug(title, db, existing_post_id=post.id)
        post.title = title
        post.content_url = body
        # Sorting key for the feed: an edit floats the post back to the top.
        post.date = _to_datetime(payload.updated_at_ms)

    db.commit()
    return {"updated": len(posts), "status": "ok"}


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


# ---------------------------------------------------------------------------
# Note picker + embedding (admin-facing)
# ---------------------------------------------------------------------------
#
# The admin UI runs in a browser, so it must never hold the shared secret. These
# routes authenticate the human with Firebase (like every other admin route) and
# then call w_notes server-side with the secret. The browser only ever sees note
# titles and bodies, never the credential.

W_NOTES_BASE = os.getenv("W_NOTES_API_BASE", "")
_TIMEOUT = httpx.Timeout(10.0)


def _w_notes_client() -> httpx.AsyncClient:
    """Client pointed at the w_notes read API, or 503 if it isn't configured."""
    secret = os.getenv("NOTES_INGEST_SECRET", "")
    if not W_NOTES_BASE or not secret:
        raise HTTPException(
            status_code=503,
            detail="Note embedding is not configured (W_NOTES_API_BASE / NOTES_INGEST_SECRET)",
        )
    return httpx.AsyncClient(
        base_url=W_NOTES_BASE.rstrip("/"),
        timeout=_TIMEOUT,
        headers={"X-Ingest-Secret": secret},
    )


class EmbedRequest(BaseModel):
    note_id: str = Field(..., description="w_notes note id to embed")
    category: str = Field(..., description="Subject the note is filed under")
    # Optional: embedding should ask for nothing but which note it is. Left
    # unset, the album falls back to the note's own folder name, then to
    # "notes" for a note that lives at the root.
    album: str | None = Field(default=None, max_length=100)
    is_major: bool = False
    tags: list[str] = Field(default_factory=list)


@router.get("/available")
async def list_available_notes(current_user=Depends(verify_firebase_token)):
    """The note picker's list, proxied from w_notes."""
    async with _w_notes_client() as client:
        try:
            response = await client.get("/embed/notes")
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("[notes] could not reach w_notes: %s", exc)
            raise HTTPException(status_code=502, detail="Could not reach the notes service") from exc
    return response.json()


@router.post("/embed", response_model=PostResponse)
async def embed_note(
    payload: EmbedRequest,
    db: Session = Depends(get_db),
    current_user=Depends(verify_firebase_token),
):
    """Place a note as a post inside the chosen subject.

    This is the only path that *creates* a note-backed post; the ingest endpoint
    only ever refreshes one. The body is fetched server-side and sanitized here,
    on arrival, before it is stored.
    """
    async with _w_notes_client() as client:
        try:
            response = await client.get(f"/embed/notes/{payload.note_id}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Note not found")
            response.raise_for_status()
        except HTTPException:
            raise
        except httpx.HTTPError as exc:
            logger.warning("[notes] could not fetch note: %s", exc)
            raise HTTPException(status_code=502, detail="Could not reach the notes service") from exc

    note = response.json()
    # Everything the post displays comes from the note itself — the admin picks
    # the subject and the note, nothing else.
    title = (note.get("title") or "").strip() or "Untitled note"
    album = payload.album or (note.get("folder") or "").strip() or "notes"
    body = sanitize_body(note.get("body_html") or "")
    when = _to_datetime(note.get("updated_at") or 0)

    post = Post(
        source=SOURCE,
        source_id=payload.note_id,
        category=payload.category,
        album=album,
        title=title,
        slug=generate_unique_slug(title, db),
        # Text posts store content inline rather than as an S3 URL; the feed
        # treats a non-http content_url as text. thumbnail_url is NOT NULL, and
        # empty is what marks "no image".
        content_url=body,
        thumbnail_url="",
        post_type="note",
        date=when,
        created_at=when,
        tags=payload.tags,
        is_major=payload.is_major,
        is_active=True,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
