from sqlalchemy import Column, String, Text, DateTime, func, Boolean, Numeric, Integer, true
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from app.database import Base

class Post(Base):
    __tablename__ = "posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), nullable=True, unique=True, index=True)
    post_type = Column(String, nullable=True)  # 'text', 'photo', 'audio', 'video', 'file'
    category = Column(String(50), nullable=False)
    album = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=False)
    splash_image_url = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    gallery_urls = Column(ARRAY(Text), nullable=False, default=list)
    is_major = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    cross_post_albums = Column(ARRAY(Text), nullable=False, default=list)
    # Shop posts: the Printify product this listing sells. Printify holds the
    # variants and their prices; `price` above is a cached "from" price.
    printify_product_id = Column(String(64), nullable=True)
    # 'printify' or 'meetup' (sold in person; `price` is the asking price and
    # `stock` how many are left). NULL for posts that aren't shop items.
    listing_type = Column(String(16), nullable=True)
    stock = Column(Integer, nullable=True)
    accepts_offers = Column(Boolean, nullable=False, default=False)
    fb_marketplace_url = Column(Text, nullable=True)
    # Provenance for mirrored posts: 'w_notes' + the upstream note id. NULL for
    # posts authored here. The pair is uniquely indexed so ingest can upsert.
    source = Column(String(50), nullable=True)
    source_id = Column(String(255), nullable=True)
    # Instagram's id for this post once it has been published there. NULL means
    # never published. Instagram has no delete or edit endpoint, so this is a
    # one-way record and the guard that stops a re-save from double-posting.
    instagram_media_id = Column(String(255), nullable=True)
    # Whether an art/photo post is mirrored to Aiko. On unless switched off in
    # the admin; Instagram publishing also requires it, since the Instagram
    # caption links to the Aiko pin.
    mirror_to_aiko = Column(Boolean, nullable=False, default=True, server_default=true())
    # What the Instagram post carries besides the caption. Only read when the
    # post is published there, never shown on the site: hashtags, stored bare,
    # without the '#'. The instagram_collaborators, instagram_location_*,
    # instagram_user_tags and instagram_photo_tags columns still exist in the
    # database from earlier versions but are unused.
    instagram_hashtags = Column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
