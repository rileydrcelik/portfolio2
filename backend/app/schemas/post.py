from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class PostBase(BaseModel):
    category: str = Field(..., description="Category: art, photo, music, projects, bio")
    album: str = Field(..., description="Album within category")
    title: str = Field(..., max_length=255)
    description: str
    content_url: str = Field(..., max_length=500, description="S3 URL to main content")
    thumbnail_url: str = Field(..., max_length=500, description="S3 URL to thumbnail")
    date: datetime = Field(..., description="Date for sorting/feed")

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    category: Optional[str] = None
    album: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    date: Optional[datetime] = None

class PostResponse(PostBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

