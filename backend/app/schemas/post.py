from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID

class PostBase(BaseModel):
    category: str = Field(..., description="Category: art, photo, music, projects, bio")
    album: str = Field(..., description="Album within category")
    title: str = Field(..., max_length=255)
    description: str
    content_url: str = Field(..., description="URL to main content (S3 or base64 data URL)")
    thumbnail_url: str = Field(..., description="URL to thumbnail (S3 or base64 data URL)")
    splash_image_url: Optional[str] = Field(default=None, description="Optional hero image for splash screen")
    date: datetime = Field(..., description="Date for sorting/feed")
    tags: List[str] = Field(default_factory=list, description="Tags for technology, techniques, emotions, etc.")
    is_major: bool = Field(default=False, description="Flag indicating whether the post is major (featured)")

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
    date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    is_major: Optional[bool] = None
    slug: Optional[str] = None

class PostResponse(PostBase):
    slug: str
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
