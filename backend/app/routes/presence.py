"""What is playing in mariposa, the owner's music app, for the now-playing post.

Three audiences, three kinds of credential:

- The phone pushes snapshots and covers with ``PRESENCE_INGEST_SECRET``, its
  own secret rather than the notes one, so a leaked phone key reaches this
  and nothing else.
- Anyone can read the current state; it is what the card on the site shows.
- The admin places the card with a Firebase login, like embedding a note.

The phone never touches posts. A now-playing post is a marker -- where the live
card goes -- and its content is read from here when the card is drawn. Bumping
the post's date on every song would reshuffle the feed once a minute.

Privacy: what reaches the public read is a song's title, artists, album, cover
and gradient, and when it played. The app's track id is a YouTube video id; it
is kept only as an HMAC (`track_key`) and never returned.
"""

import hashlib
import hmac
import io
import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.lib.firebase_auth import verify_firebase_token
from app.lib.presence_state import Stored, accepts, effective_state
from app.lib.s3 import delete_file_from_s3, upload_file_to_s3
from app.models.post import Post
from app.models.presence import NowPlaying, PresenceArtwork, RecentPlay
from app.routes.posts import generate_unique_slug
from app.schemas.post import PostResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/presence", tags=["presence"])

SOURCE = "mariposa"
RECENT_KEPT = 20
MAX_ARTWORK_BYTES = 5 * 1024 * 1024
ARTWORK_SIZE = 600


def _secret() -> str:
    return os.getenv("PRESENCE_INGEST_SECRET", "")


def require_presence_secret(x_ingest_secret: Optional[str] = Header(default=None)) -> None:
    """Authenticate the phone. Fails closed: unset means the endpoint is off."""
    expected = _secret()
    if not expected:
        raise HTTPException(status_code=503, detail="Presence is not configured")
    if not x_ingest_secret or not secrets.compare_digest(x_ingest_secret, expected):
        raise HTTPException(status_code=401, detail="Invalid presence credentials")


def track_key(track_id: str) -> str:
    """The stored stand-in for the app's track id; see the module docstring."""
    return hmac.new(_secret().encode(), track_id.encode(), hashlib.sha256).hexdigest()[:32]


def _utcnow() -> datetime:
    """Naive UTC, as every other timestamp in this database is stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat(timespec="seconds") + "Z" if value else None


# ---------------------------------------------------------------------------
# Ingest (phone)
# ---------------------------------------------------------------------------


class TrackIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., max_length=500)
    artists: List[str] = Field(default_factory=list, max_length=20)
    album: Optional[str] = Field(default=None, max_length=500)
    duration_s: Optional[float] = Field(default=None, ge=0, le=86400)
    # `${art_ext}:${file size}`, or None for a song with no cover.
    art_rev: Optional[str] = Field(default=None, max_length=64)
    gradient: Optional[List[str]] = Field(default=None, max_length=2)


class PresenceIngest(BaseModel):
    session: str = Field(..., min_length=1, max_length=64)
    counter: int = Field(..., ge=0)
    # How long ago the phone saw this state; nonzero for a retried send.
    age_ms: int = Field(default=0, ge=0, le=24 * 3600 * 1000)
    state: Literal["playing", "paused", "stopped", "hidden"]
    position_s: float = Field(default=0, ge=0, le=86400)
    track: Optional[TrackIn] = None


def _clean_artists(artists: List[str]) -> List[str]:
    return [a.strip()[:200] for a in artists if a.strip()]


def _clean_gradient(gradient: Optional[List[str]]) -> Optional[List[str]]:
    # Drawn as CSS colours on the site, so only short colour-looking strings.
    if not gradient or len(gradient) != 2:
        return None
    ok = all(len(c) <= 40 and all(ch.isalnum() or ch in "#(),.% -" for ch in c) for c in gradient)
    return gradient if ok else None


@router.post("/ingest", dependencies=[Depends(require_presence_secret)])
async def ingest(payload: PresenceIngest, db: Session = Depends(get_db)):
    """Store a snapshot if it is newer than the stored one.

    Answers whether the site still needs this song's cover, which the phone
    then sends to /artwork. An out-of-order snapshot is answered 200 and
    dropped, so the phone's retry logic has nothing to handle.
    """
    now = _utcnow()
    observed_at = now - timedelta(milliseconds=payload.age_ms)
    row = db.get(NowPlaying, 1)
    if not accepts(
        row.session if row else None,
        row.counter if row else None,
        row.observed_at if row else None,
        payload.session,
        payload.counter,
        observed_at,
    ):
        return {"accepted": False, "need_artwork": False}

    track = payload.track if payload.state != "hidden" else None
    key = track_key(track.id) if track else None

    if row is None:
        row = NowPlaying(id=1, version=0)
        db.add(row)
    row.state = payload.state
    row.session = payload.session
    row.counter = payload.counter
    row.observed_at = observed_at
    row.track_key = key
    row.title = track.title.strip() if track else None
    row.artists = _clean_artists(track.artists) if track else []
    row.album = ((track.album or "").strip() or None) if track else None
    row.duration_s = track.duration_s if track else None
    row.gradient = _clean_gradient(track.gradient) if track else None
    row.position_s = payload.position_s
    row.position_at = observed_at
    row.last_heartbeat_at = observed_at
    row.version = (row.version or 0) + 1

    if payload.state == "playing" and track:
        latest = db.query(RecentPlay).order_by(RecentPlay.played_at.desc(), RecentPlay.id.desc()).first()
        # A song counts once per stretch of play: heartbeats, seeks and a
        # pause-then-resume of the same song are not new plays.
        if latest is None or latest.track_key != key:
            db.add(
                RecentPlay(
                    track_key=key,
                    title=row.title,
                    artists=row.artists,
                    album=row.album,
                    gradient=row.gradient,
                    played_at=observed_at,
                )
            )
            db.flush()
            keep = (
                db.query(RecentPlay.id)
                .order_by(RecentPlay.played_at.desc(), RecentPlay.id.desc())
                .limit(RECENT_KEPT)
                .subquery()
            )
            db.query(RecentPlay).filter(~RecentPlay.id.in_(keep.select())).delete(synchronize_session=False)

    need_artwork = False
    if track and track.art_rev:
        art = db.get(PresenceArtwork, key)
        need_artwork = art is None or art.art_rev != track.art_rev

    db.commit()
    _invalidate_read_cache()
    return {"accepted": True, "need_artwork": need_artwork}


@router.post("/artwork", dependencies=[Depends(require_presence_secret)])
async def upload_artwork(
    track_id: str = Form(..., min_length=1, max_length=64),
    art_rev: str = Form(..., min_length=1, max_length=64),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Store a song's cover: squared, 600 px, re-encoded as JPEG.

    Re-encoding is also what makes this safe to serve: whatever arrived, what
    goes to S3 is pixels Pillow decoded, with no metadata carried over.
    """
    content = await file.read(MAX_ARTWORK_BYTES + 1)
    if len(content) > MAX_ARTWORK_BYTES:
        raise HTTPException(status_code=413, detail="Cover is too large")
    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Not an image") from exc

    image = image.convert("RGB")
    # Centre-cropped square: YouTube covers are square art letterboxed into
    # 16:9, and the card draws a square.
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    if side > ARTWORK_SIZE:
        image = image.resize((ARTWORK_SIZE, ARTWORK_SIZE), Image.LANCZOS)
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=85, optimize=True)

    url = upload_file_to_s3(out.getvalue(), "cover.jpg", "image/jpeg", folder="now-playing")
    key = track_key(track_id)
    art = db.get(PresenceArtwork, key)
    old_url = art.url if art else None
    if art is None:
        db.add(PresenceArtwork(track_key=key, art_rev=art_rev, url=url, updated_at=_utcnow()))
    else:
        art.art_rev = art_rev
        art.url = url
        art.updated_at = _utcnow()
    row = db.get(NowPlaying, 1)
    if row is not None:
        # The cover is looked up at read time; the version bump is what makes
        # a card that already has the song fetch it again rather than a 304.
        row.version = (row.version or 0) + 1
    db.commit()
    if old_url and old_url != url:
        delete_file_from_s3(old_url)
    _invalidate_read_cache()
    return {"url": url}


# ---------------------------------------------------------------------------
# Public read (the card)
# ---------------------------------------------------------------------------

# Every visitor's card polls; two seconds of cache absorbs a crowd without
# making the card any less live, since it extrapolates position itself.
_READ_TTL = 2.0
_read_cache: dict = {"at": 0.0, "body": None, "etag": None}


def _invalidate_read_cache() -> None:
    _read_cache["at"] = 0.0


def _read(db: Session) -> tuple[dict, str]:
    now = _utcnow()
    row = db.get(NowPlaying, 1)
    stored = (
        Stored(
            state=row.state,
            has_track=row.track_key is not None,
            position_s=row.position_s,
            position_at=row.position_at,
            last_heartbeat_at=row.last_heartbeat_at,
            duration_s=row.duration_s,
        )
        if row
        else None
    )
    eff = effective_state(stored, now)
    body: dict = {
        "state": eff.state,
        "track": None,
        "position_s": 0,
        "position_at": None,
        "last_active_at": _iso(eff.last_active_at),
        "server_now": _iso(now),
        "recent": [],
    }
    if eff.state != "hidden":
        keys = set()
        if row and row.track_key:
            keys.add(row.track_key)
        recent_rows = (
            db.query(RecentPlay)
            .order_by(RecentPlay.played_at.desc(), RecentPlay.id.desc())
            .limit(RECENT_KEPT + 1)
            .all()
        )
        # The card's own song heads the list already; not twice.
        if recent_rows and row and recent_rows[0].track_key == row.track_key:
            recent_rows = recent_rows[1:]
        recent_rows = recent_rows[:RECENT_KEPT]
        keys.update(r.track_key for r in recent_rows)
        art = {a.track_key: a.url for a in db.query(PresenceArtwork).filter(PresenceArtwork.track_key.in_(keys))} if keys else {}

        if row and row.track_key:
            body["track"] = {
                "title": row.title,
                "artists": row.artists or [],
                "album": row.album,
                "duration_s": row.duration_s,
                "artwork_url": art.get(row.track_key),
                "gradient": row.gradient,
            }
            body["position_s"] = row.position_s
            body["position_at"] = _iso(row.position_at)
        body["recent"] = [
            {
                "title": r.title,
                "artists": r.artists or [],
                "album": r.album,
                "artwork_url": art.get(r.track_key),
                "gradient": r.gradient,
                "played_at": _iso(r.played_at),
            }
            for r in recent_rows
        ]
    # server_now is left out of the tag: it changes every read, and a card
    # holding an older one only loses a clock offset that has not moved.
    etag = '"{}-{}-{}"'.format(row.version if row else 0, eff.state, body["last_active_at"] or "")
    return body, etag


@router.get("/now-playing")
async def now_playing(request: Request, response: Response, db: Session = Depends(get_db)):
    """What the now-playing card shows. Public; the phone decides what is in it."""
    if time.monotonic() - _read_cache["at"] > _READ_TTL:
        body, etag = _read(db)
        _read_cache.update(at=time.monotonic(), body=body, etag=etag)
    body, etag = _read_cache["body"], _read_cache["etag"]
    headers = {"ETag": etag, "Cache-Control": "no-cache"}
    # A proxy that compresses the body weakens the tag to W/"..."; still a match.
    if (request.headers.get("if-none-match") or "").removeprefix("W/") == etag:
        return Response(status_code=304, headers=headers)
    response.headers.update(headers)
    return body


# ---------------------------------------------------------------------------
# Placing the card (admin)
# ---------------------------------------------------------------------------


class EmbedRequest(BaseModel):
    category: str = Field(..., max_length=50, description="Subject the card is placed in")
    album: Optional[str] = Field(default=None, max_length=100)
    is_major: bool = False


@router.post("/embed", response_model=PostResponse)
async def embed_now_playing(
    payload: EmbedRequest,
    db: Session = Depends(get_db),
    current_user=Depends(verify_firebase_token),
):
    """Place the now-playing card in a subject. Once per subject."""
    source_id = f"now-playing:{payload.category}"
    if db.query(Post).filter(Post.source == SOURCE, Post.source_id == source_id).first():
        raise HTTPException(status_code=409, detail="This subject already has a now-playing card")

    now = _utcnow()
    post = Post(
        source=SOURCE,
        source_id=source_id,
        category=payload.category,
        album=(payload.album or "").strip() or "listening",
        title="Now playing",
        slug=generate_unique_slug("Now playing", db),
        # A marker: no body, no image. Both columns are NOT NULL, and empty is
        # what the feed and delete_post already read as "nothing to fetch".
        content_url="",
        thumbnail_url="",
        post_type="now_playing",
        date=now,
        created_at=now,
        is_major=payload.is_major,
        is_active=True,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

