from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class AlbumBase(BaseModel):
    subject_id: UUID = Field(..., description="Subject ID (category)")
    name: str = Field(..., max_length=255, description="Album name")
    slug: str = Field(..., max_length=255, description="Album slug (URL-friendly)")
    description: Optional[str] = None
    cover_image: Optional[str] = None

class AlbumCreate(AlbumBase):
    pass

class AlbumUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    is_active: Optional[bool] = None

class AlbumResponse(AlbumBase):
    id: UUID
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

