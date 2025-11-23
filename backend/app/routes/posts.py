import logging
import re
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.post import Post
from app.schemas.post import PostCreate, PostUpdate, PostResponse
from app.lib.s3 import delete_file_from_s3
from app.lib.firebase_auth import verify_firebase_token

logger = logging.getLogger(__name__)


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip('-')


def generate_unique_slug(title: str, db: Session, existing_post_id=None) -> str:
    base_slug = slugify(title) or f"post-{uuid4().hex[:8]}"
    slug = base_slug
    counter = 1

    while True:
        query = db.query(Post).filter(Post.slug == slug)
        if existing_post_id:
            query = query.filter(Post.id != existing_post_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}" if counter < 50 else f"{base_slug}-{uuid4().hex[:4]}"
        counter += 1


router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("/", response_model=List[PostResponse])
async def get_posts(
    category: Optional[str] = None,
    album: Optional[str] = None,
    tag: Optional[str] = None,
    is_major: Optional[bool] = None,
    is_favorite: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all posts with optional filters"""
    query = db.query(Post)
    
    if category:
        query = query.filter(Post.category == category)
    if album:
        query = query.filter(Post.album == album)
    if tag:
        query = query.filter(Post.tags.contains([tag]))
    if is_major is not None:
        query = query.filter(Post.is_major == is_major)
    if is_favorite is not None:
        query = query.filter(Post.is_favorite == is_favorite)
    
    try:
        posts = query.order_by(desc(Post.date)).limit(limit).offset(offset).all()
        return posts
    except Exception as exc:
        logger.exception("[Posts] Failed to fetch posts", extra={
            "category": category,
            "album": album,
            "is_major": is_major,
            "limit": limit,
            "offset": offset,
        })
        raise HTTPException(status_code=500, detail="Error fetching posts") from exc

@router.get("/albums/{category}")
async def get_unique_albums_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    """Get unique album names from posts for a given category"""
    try:
        # Get distinct album values from posts for this category
        albums = db.query(Post.album).filter(
            Post.category == category
        ).distinct().all()
        
        # Extract album names from tuples
        album_names = [album[0] for album in albums if album[0]]
        
        return {"albums": sorted(album_names)}
    except Exception as e:
        print(f"[Posts] Error getting unique albums: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching albums: {str(e)}")

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, db: Session = Depends(get_db)):
    """Get a single post by ID"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.get("/slug/{slug}", response_model=PostResponse)
async def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.post("/", response_model=PostResponse)
async def create_post(post: PostCreate, db: Session = Depends(get_db), current_user=Depends(verify_firebase_token)):
    """Create a new post"""
    data = post.dict(exclude_unset=True)
    title = data.get('title')
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    slug = data.get('slug') or generate_unique_slug(title, db)
    data['slug'] = slug

    category = data.get('category')
    is_major = data.get('is_major', False)

    if 'tags' not in data or data['tags'] is None:
        data['tags'] = []
    if 'gallery_urls' not in data or data['gallery_urls'] is None:
        data['gallery_urls'] = []

    if is_major and category in {'art', 'photo'}:
        if not data.get('splash_image_url'):
            data['splash_image_url'] = data.get('content_url')
    else:
        if not data.get('splash_image_url'):
            data['splash_image_url'] = data.get('thumbnail_url')

    db_post = Post(**data)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(verify_firebase_token)
):
    """Update an existing post"""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_payload = post_update.dict(exclude_unset=True)

    for key, value in update_payload.items():
        setattr(db_post, key, value)

    if 'title' in update_payload and not update_payload.get('slug'):
        db_post.slug = generate_unique_slug(db_post.title, db, existing_post_id=db_post.id)

    if (
        ('thumbnail_url' in update_payload or 'content_url' in update_payload or 'is_major' in update_payload or 'category' in update_payload)
        and 'splash_image_url' not in update_payload
    ):
        if db_post.is_major and db_post.category in {'art', 'photo'}:
            db_post.splash_image_url = db_post.content_url
        elif not db_post.splash_image_url:
            db_post.splash_image_url = db_post.thumbnail_url
 
    db.commit()
    db.refresh(db_post)
    return db_post

@router.delete("/{post_id}")
async def delete_post(post_id: str, db: Session = Depends(get_db), current_user=Depends(verify_firebase_token)):
    """Delete a post"""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    content_url = db_post.content_url
    thumbnail_url = db_post.thumbnail_url

    db.delete(db_post)
    db.commit()

    # Delete associated assets from S3 (best-effort)
    delete_file_from_s3(content_url)
    if thumbnail_url and thumbnail_url != content_url:
        delete_file_from_s3(thumbnail_url)
    return {"message": "Post deleted successfully"}

