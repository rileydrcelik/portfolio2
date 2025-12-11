from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID

class PostBase(BaseModel):
    category: str = Field(..., description="Category: art, photo, music, projects, bio, apparel")
    album: str = Field(..., description="Album within category")
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    content_url: str = Field(..., description="URL to main content (S3 or base64 data URL)")
    thumbnail_url: str = Field(..., description="URL to thumbnail (S3 or base64 data URL)")
    splash_image_url: Optional[str] = Field(default=None, description="Optional hero image for splash screen")
    post_type: Optional[str] = Field(default=None, description="Type of post: text, photo, audio, video, file")
    date: datetime = Field(..., description="Date for sorting/feed")
    tags: List[str] = Field(default_factory=list, description="Tags for technology, techniques, emotions, etc.")
    is_major: bool = Field(default=False, description="Flag indicating whether the post is major (featured)")
    price: Optional[float] = Field(default=None, ge=0, description="Price for apparel posts")
    gallery_urls: List[str] = Field(default_factory=list, description="Additional gallery images for apparel posts")
    is_active: bool = Field(default=False, description="Flag indicating whether the project is active")
    is_favorite: bool = Field(default=False, description="Flag indicating whether the post is a favorite")

class PostCreate(PostBase):
    slug: Optional[str] = Field(default=None, description="Custom slug override")

class PostUpdate(BaseModel):
    category: Optional[str] = None
    album: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    splash_image_url: Optional[str] = None
    post_type: Optional[str] = None
    tags: Optional[List[str]] = None
    is_major: Optional[bool] = None
    price: Optional[float] = None
    gallery_urls: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
    date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PostResponse(PostBase):
    id: UUID
    slug: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
