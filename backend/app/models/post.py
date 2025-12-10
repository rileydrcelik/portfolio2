from sqlalchemy import Column, String, Text, DateTime, func, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from app.database import Base

class Post(Base):
    __tablename__ = "posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), nullable=False, unique=True)
    category = Column(String(50), nullable=False)
    album = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=False)
    splash_image_url = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False)
    tags = Column(ARRAY(Text), nullable=False, default=[])
    price = Column(Numeric(10, 2), nullable=True)
    gallery_urls = Column(ARRAY(Text), nullable=False, default=list)
    is_major = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
