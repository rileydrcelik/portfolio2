from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal, Optional, List
from uuid import UUID
import re

# Instagram's own limit.
MAX_INSTAGRAM_HASHTAGS = 30


def _clean_hashtags(tags: Optional[List[str]]) -> Optional[List[str]]:
    """Bare hashtags: no '#', nothing Instagram would cut the tag short at
    (it ends a hashtag at the first character that isn't a letter, digit or
    underscore), no case-insensitive repeats."""
    if tags is None:
        return None
    cleaned, seen = [], set()
    for tag in tags:
        tag = re.sub(r"\W", "", tag or "")
        if tag and tag.lower() not in seen:
            seen.add(tag.lower())
            cleaned.append(tag)
    if len(cleaned) > MAX_INSTAGRAM_HASHTAGS:
        raise ValueError(f"Instagram allows at most {MAX_INSTAGRAM_HASHTAGS} hashtags")
    return cleaned


class InstagramFields(BaseModel):
    """Validation shared by the create and update schemas."""

    @field_validator("instagram_hashtags", check_fields=False)
    @classmethod
    def _hashtags(cls, v):
        return _clean_hashtags(v)

class PostBase(InstagramFields):
    category: str = Field(..., description="Category: art, photo, music, projects, bio, apparel")
    album: str = Field(..., description="Album within category")
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    content_url: str = Field(..., description="URL to main content (S3 or base64 data URL)")
    thumbnail_url: str = Field(..., description="URL to thumbnail (S3 or base64 data URL)")
    splash_image_url: Optional[str] = Field(default=None, description="Optional hero image for splash screen")
    post_type: Optional[str] = Field(default=None, description="Type of post: text, photo, audio, video, file")
    date: datetime = Field(..., description="Date for sorting/feed")
    is_major: bool = Field(default=False, description="Flag indicating whether the post is major (featured)")
    price: Optional[float] = Field(default=None, ge=0, description="Price for apparel posts")
    gallery_urls: List[str] = Field(default_factory=list, description="Additional gallery images for apparel posts")
    is_active: bool = Field(default=False, description="Flag indicating whether the project is active")
    is_favorite: bool = Field(default=False, description="Flag indicating whether the post is a favorite")
    cross_post_albums: List[str] = Field(default_factory=list, description="Additional album slugs this post appears in")
    printify_product_id: Optional[str] = Field(default=None, description="Printify product sold by a shop post")
    listing_type: Optional[Literal["printify", "meetup"]] = Field(default=None, description="How a shop post is sold")
    stock: Optional[int] = Field(default=None, ge=0, description="Meetup items left")
    accepts_offers: bool = Field(default=False, description="Meetup item takes offers below the asking price")
    fb_marketplace_url: Optional[str] = Field(default=None, description="The same item on Facebook Marketplace")
    mirror_to_aiko: bool = Field(default=True, description="Mirror this art/photo post to Aiko")
    instagram_hashtags: List[str] = Field(default_factory=list, description="Hashtags for the Instagram caption, without '#'")

class PostCreate(PostBase):
    slug: Optional[str] = Field(default=None, description="Custom slug override")
    # Not a column: a per-request instruction, popped before the Post is built.
    # Has no equivalent on PostUpdate, because publishing to Instagram cannot be
    # undone or edited through their API -- it happens once, at creation. On by
    # default so new photos go out automatically; it only takes effect for a
    # photo post that is also mirrored to Aiko, and does nothing otherwise.
    post_to_instagram: bool = Field(
        default=True,
        description="Also publish this photo post to Instagram (one-way, cannot be undone)",
    )

class PostUpdate(InstagramFields):
    category: Optional[str] = None
    album: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    splash_image_url: Optional[str] = None
    post_type: Optional[str] = None
    is_major: Optional[bool] = None
    price: Optional[float] = None
    gallery_urls: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
    cross_post_albums: Optional[List[str]] = None
    printify_product_id: Optional[str] = None
    listing_type: Optional[Literal["printify", "meetup"]] = None
    stock: Optional[int] = Field(default=None, ge=0)
    accepts_offers: Optional[bool] = None
    fb_marketplace_url: Optional[str] = None
    mirror_to_aiko: Optional[bool] = None
    instagram_hashtags: Optional[List[str]] = None
    date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PostResponse(PostBase):
    id: UUID
    slug: Optional[str] = None
    instagram_media_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
