"""Publish new photo posts to Instagram, captioned with a link to their Aiko pin.

This is deliberately *not* shaped like :mod:`app.lib.aiko_sync`, even though the
two do a similar-sounding job. Aiko is a mirror: it reconciles on every edit and
takes pins down when a post stops qualifying. Instagram cannot be mirrored --
the Graph API has no endpoint to delete a published post or edit its caption, so
a push here is one-way and permanent.

Four rules follow from that:

- **On create only, with an opt-out.** ``post_to_instagram`` defaults to True on
  ``PostCreate``, so a new photo post goes out automatically, but the admin can
  switch it off for one post. Edits never publish -- there is nothing to update.
- **Only through Aiko.** The caption links to the post's Aiko pin, and that
  pin's id only exists once Aiko has accepted the push. :func:`mirror_then_publish`
  runs the two in order in one background task, and if the post isn't mirrored,
  or Aiko is down or rejects the image, nothing goes to Instagram.
- **Exactly once.** ``instagram_media_id`` is written back after a successful
  publish and is the guard against double-posting. A post that already carries
  one is skipped, so re-saving or re-running a backfill cannot duplicate it.
- **Never break a save.** Like the Aiko mirror, every push runs as a FastAPI
  background task and swallows its own errors. Instagram being down, rate
  limited, or holding an expired token must not fail publishing on the site.

The format work in :func:`_prepare_jpeg` exists because the site's own upload
pipeline converts everything to WebP, and Instagram's ``image_url`` accepts
**JPEG only** -- it also rejects anything outside a 4:5 to 1.91:1 aspect ratio.
So the image the site serves is never the image Instagram is handed; a JPEG
derivative is rendered and parked in S3 under ``instagram/`` at publish time.
Those derivatives are not tracked on the post and are not cleaned up when a post
is deleted; they are a few hundred KB each and orphaning them is cheaper than
carrying another column and another delete path for them.
"""

import asyncio
import io
import logging
import os
from types import SimpleNamespace
from typing import Optional

import httpx
from PIL import Image

from app.database import SessionLocal
from app.lib import aiko_sync
from app.lib.s3 import upload_file_to_s3
from app.models.post import Post

logger = logging.getLogger(__name__)

# Photos only. Art reaches Aiko but not Instagram; add "art" here to change that.
PUBLISHABLE_CATEGORIES = {"photo"}

# Photo posts are created without a post_type in practice; the field is only set
# for the audio/video/file posts other categories carry.
PUBLISHABLE_POST_TYPES = {None, "", "photo", "image"}

# Instagram's feed limits. Outside this ratio range the container is rejected,
# so anything taller or wider is padded to the nearest bound rather than failing.
MIN_ASPECT = 4 / 5      # 0.8, portrait bound
MAX_ASPECT = 1.91       # landscape bound

# Instagram downsizes anything wider than this anyway; doing it here keeps the
# JPEG small enough to stay well under the 8MB fetch limit.
MAX_WIDTH = 1440

# Captions are capped at 2200 characters.
MAX_CAPTION = 2200

# A carousel holds 2 to 10 items through the API. The admin form stops a photo
# group at 10, so the cap here only guards against a group edited by hand.
MAX_CAROUSEL = 10

# Fetching the image from S3 and rendering the container is Meta-side work; it
# is usually instant for a photo but is allowed to be slow.
_TIMEOUT = httpx.Timeout(120.0)

# How long to wait for a container to finish before giving up.
_STATUS_ATTEMPTS = 10
_STATUS_DELAY = 3.0


def _config() -> Optional[tuple[str, str, str]]:
    """``(base_url, ig_user_id, access_token)``, or None when unconfigured.

    Unset means "no Instagram" rather than an error, matching the Aiko mirror:
    local dev and any environment without credentials runs normally with pushes
    skipped, and the toggle in the admin simply does nothing.
    """
    user_id = os.getenv("INSTAGRAM_USER_ID", "").strip()
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not user_id or not token:
        return None
    version = os.getenv("INSTAGRAM_GRAPH_VERSION", "v23.0").strip().strip("/")
    host = os.getenv("INSTAGRAM_GRAPH_HOST", "https://graph.instagram.com").strip().rstrip("/")
    return f"{host}/{version}", user_id, token


def is_configured() -> bool:
    return _config() is not None


def snapshot(post) -> SimpleNamespace:
    """Detach the fields the push needs from the SQLAlchemy instance.

    Background tasks run *after* the request's session is closed, so reading a
    lazy attribute off the live ORM object at that point raises
    ``DetachedInstanceError``. Same reasoning as ``aiko_sync.snapshot``.
    """
    return SimpleNamespace(
        id=post.id,
        title=post.title,
        description=post.description,
        category=post.category,
        post_type=post.post_type,
        content_url=post.content_url,
        thumbnail_url=post.thumbnail_url,
        gallery_urls=list(post.gallery_urls or []),
        instagram_media_id=post.instagram_media_id,
        instagram_hashtags=list(post.instagram_hashtags or []),
    )


def _image_url(post) -> Optional[str]:
    """The full-size image to publish, matching the Aiko mirror's preference."""
    return (post.content_url or "").strip() or (post.thumbnail_url or "").strip() or None


def should_publish(post) -> bool:
    """Whether this post *can* go to Instagram -- not whether it was asked to.

    The admin's toggle decides intent; this decides eligibility. A photo post,
    with a fetchable image, that has not already been published.
    """
    if post.instagram_media_id:
        return False
    if post.category not in PUBLISHABLE_CATEGORIES:
        return False
    if (post.post_type or None) not in PUBLISHABLE_POST_TYPES:
        return False

    image_url = _image_url(post)
    return bool(image_url and image_url.startswith(("http://", "https://")))


def _hashtag_line(post) -> str:
    return " ".join(f"#{tag}" for tag in (getattr(post, "instagram_hashtags", None) or []))


def _caption(post, link: Optional[str] = None) -> str:
    """The description (or the title, when there is none), the link, then the
    hashtags.

    Instagram renders caption URLs as plain text, not links, so this is there to
    be read and typed or copied, not clicked. When the caption runs long the
    text is trimmed rather than the link or the hashtags, since those are the
    reason the caption is there.
    """
    text = (post.description or "").strip() or (post.title or "").strip()
    tail = [part for part in ((link or "").strip(), _hashtag_line(post)) if part]
    room = MAX_CAPTION - sum(len(part) + 2 for part in tail)
    if len(text) > room:
        text = text[: max(room - 1, 0)].rstrip() + "…"
    return "\n\n".join(part for part in (text, *tail) if part)


def _clamp_aspect(aspect: float) -> float:
    return min(max(aspect, MIN_ASPECT), MAX_ASPECT)


def _pad_to_aspect(img: Image.Image, target: Optional[float] = None) -> Image.Image:
    """Letterbox the image onto white until it has the ``target`` ratio, or by
    default the nearest ratio Instagram accepts.

    Cropping would be the other option and is what most tools do, but this site
    is a portfolio -- silently trimming the edge off a piece of art is worse
    than a white border around it.
    """
    width, height = img.size
    aspect = width / height
    target = target if target is not None else _clamp_aspect(aspect)

    if abs(aspect - target) < 0.005:
        return img

    if aspect < target:
        # Too tall: widen the canvas.
        target_width = int(round(height * target))
        target_height = height
    else:
        # Too wide: heighten the canvas.
        target_width = width
        target_height = int(round(width / target))

    canvas = Image.new("RGB", (target_width, target_height), (255, 255, 255))
    canvas.paste(img, ((target_width - width) // 2, (target_height - height) // 2))
    return canvas


def _aspect_of(image_bytes: bytes) -> float:
    with Image.open(io.BytesIO(image_bytes)) as img:
        return img.width / img.height


def _prepare_jpeg(image_bytes: bytes, name: str, target_aspect: Optional[float] = None) -> str:
    """Render an Instagram-acceptable JPEG into S3 and return its public URL.

    ``target_aspect`` pads to that exact ratio, for carousels: Instagram crops
    every item to the first one's shape, so padding them all to it first keeps
    the edges of every photo in frame.

    Raises on failure; the caller turns that into a logged, non-fatal outcome.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Flatten transparency onto white rather than letting JPEG turn it black.
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        background = Image.new("RGBA", img.size, (255, 255, 255, 255))
        img = Image.alpha_composite(background, img).convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img = _pad_to_aspect(img, target_aspect)

    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90, optimize=True, progressive=True)

    return upload_file_to_s3(
        file_content=buffer.getvalue(),
        file_name=f"{name}.jpg",
        content_type="image/jpeg",
        folder="instagram",
    )


async def _wait_for_container(
    client: httpx.AsyncClient, base_url: str, container_id: str, token: str
) -> Optional[str]:
    """Poll until Meta has finished fetching and processing the image.

    Returns an error string, or None when the container is ready. Images are
    usually FINISHED on the first check; the polling is here for the case where
    S3 is slow enough that publishing immediately would race the fetch.
    """
    for attempt in range(_STATUS_ATTEMPTS):
        response = await client.get(
            f"{base_url}/{container_id}",
            params={"fields": "status_code,status", "access_token": token},
        )
        if response.status_code >= 400:
            return f"status check failed: {response.status_code} {response.text[:200]}"

        body = response.json()
        status_code = body.get("status_code")
        if status_code == "FINISHED":
            return None
        if status_code == "ERROR":
            return f"container errored: {body.get('status', 'unknown')}"
        if status_code == "EXPIRED":
            return "container expired before publishing"

        if attempt < _STATUS_ATTEMPTS - 1:
            await asyncio.sleep(_STATUS_DELAY)

    return "container never finished processing"


async def publish_post(post, link: Optional[str] = None) -> dict:
    """Publish this post to Instagram, with ``link`` closing the caption. Never raises.

    Returns an outcome dict -- ``{"ok": True, "media_id": ...}`` or
    ``{"ok": False, "error": ...}``. Callers fire this as a background task and
    ignore the return; a script can use it to report per-post results.
    """
    config = _config()
    if not config:
        return {"ok": False, "error": "instagram not configured"}

    base_url, user_id, token = config
    post_id = str(post.id)
    images = aiko_sync.group_images(post)[:MAX_CAROUSEL]
    if not images:
        return {"ok": False, "error": "no image"}

    async def create_container(data: dict) -> tuple[Optional[str], Optional[dict]]:
        """POST a media container and wait for Meta to finish with it.
        Returns ``(container_id, None)`` or ``(None, failure outcome)``."""
        create = await client.post(
            f"{base_url}/{user_id}/media", data={**data, "access_token": token}
        )
        if create.status_code >= 400:
            detail = create.text[:300]
            logger.warning(
                "[instagram] container failed for post %s: %s %s",
                post_id, create.status_code, detail,
            )
            return None, {"ok": False, "status": create.status_code, "error": detail}
        container_id = create.json().get("id")
        if not container_id:
            return None, {"ok": False, "error": "no container id returned"}
        wait_error = await _wait_for_container(client, base_url, container_id, token)
        if wait_error:
            logger.warning("[instagram] post %s not publishable: %s", post_id, wait_error)
            return None, {"ok": False, "error": wait_error}
        return container_id, None

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            # 1. Pull the site's own images and re-render them as JPEGs
            #    Instagram will accept. Done here rather than in the upload
            #    route so the site keeps serving WebP and the conversion cost
            #    is only paid by posts that actually go to Instagram.
            sources = []
            for url in images:
                source = await client.get(url)
                source.raise_for_status()
                sources.append(source.content)

            # 2. Create the media container: one image, or a carousel of child
            #    containers padded to the first photo's (accepted) shape.
            if len(sources) == 1:
                jpeg_url = await asyncio.to_thread(_prepare_jpeg, sources[0], post_id)
                container_id, failure = await create_container(
                    {"image_url": jpeg_url, "caption": _caption(post, link)}
                )
                if failure:
                    return failure
            else:
                target = _clamp_aspect(_aspect_of(sources[0]))
                children = []
                for index, content in enumerate(sources):
                    jpeg_url = await asyncio.to_thread(
                        _prepare_jpeg, content, f"{post_id}-{index + 1}", target
                    )
                    child_id, failure = await create_container(
                        {"image_url": jpeg_url, "is_carousel_item": "true"}
                    )
                    if failure:
                        return failure
                    children.append(child_id)

                # 3. The carousel itself, which carries the caption.
                container_id, failure = await create_container({
                    "media_type": "CAROUSEL",
                    "children": ",".join(children),
                    "caption": _caption(post, link),
                })
                if failure:
                    return failure

            # 4. Publish it. This is the irreversible step -- there is no API to
            #    undo it.
            publish = await client.post(
                f"{base_url}/{user_id}/media_publish",
                data={"creation_id": container_id, "access_token": token},
            )
            if publish.status_code >= 400:
                detail = publish.text[:300]
                logger.warning(
                    "[instagram] publish failed for post %s: %s %s",
                    post_id, publish.status_code, detail,
                )
                return {"ok": False, "status": publish.status_code, "error": detail}

            media_id = publish.json().get("id")
            logger.info("[instagram] published post %s as media %s", post_id, media_id)
            return {"ok": True, "media_id": media_id}

    except httpx.HTTPError as exc:
        logger.warning("[instagram] could not reach Instagram for post %s: %s", post_id, exc)
        return {"ok": False, "error": f"unreachable: {exc}"}
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("[instagram] unexpected publish failure for post %s: %s", post_id, exc)
        return {"ok": False, "error": str(exc)}


async def publish_and_record(post, link: Optional[str] = None) -> dict:
    """Publish, then write the media id back so it can never post twice.

    The background task runs after the request's session is closed, so this
    opens its own. A failure to record is logged but not raised -- the post is
    already live on Instagram at that point and nothing here can undo it.
    """
    result = await publish_post(post, link)
    if not result.get("ok"):
        return result

    media_id = result.get("media_id")
    if not media_id:
        return result

    def _record() -> None:
        db = SessionLocal()
        try:
            db.query(Post).filter(Post.id == post.id).update(
                {"instagram_media_id": str(media_id)}
            )
            db.commit()
        finally:
            db.close()

    try:
        await asyncio.to_thread(_record)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning(
            "[instagram] published post %s as media %s but could not record it: %s",
            post.id, media_id, exc,
        )

    return result


async def mirror_then_publish(aiko_post, ig_post) -> dict:
    """Push to Aiko, then publish to Instagram linking to the pin Aiko made.

    Takes both modules' snapshots because each copies out different fields.
    Stands in for the route's usual Aiko push, so a post that also mirrors is
    pushed once, not twice. Instagram is skipped unless Aiko took the post: it
    can't reach Instagram without going through Aiko. Never raises.
    """
    if not aiko_sync.should_mirror(aiko_post):
        return {"ok": False, "error": "not mirrored to aiko"}

    aiko_result = await aiko_sync.push_post(aiko_post)
    if not (aiko_result.get("ok") and aiko_result.get("pin_id")):
        logger.info(
            "[instagram] skipping post %s: Aiko didn't take it (%s)",
            ig_post.id, aiko_result.get("error"),
        )
        return {"ok": False, "error": "aiko push failed", "aiko": aiko_result}

    return await publish_and_record(ig_post, aiko_sync.pin_url(aiko_result["pin_id"]))
