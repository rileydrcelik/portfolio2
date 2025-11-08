from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.post import Post
from app.schemas.post import PostCreate, PostUpdate, PostResponse

router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("/", response_model=List[PostResponse])
async def get_posts(
    category: Optional[str] = None,
    album: Optional[str] = None,
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
    
    posts = query.order_by(desc(Post.date)).limit(limit).offset(offset).all()
    return posts

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, db: Session = Depends(get_db)):
    """Get a single post by ID"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.post("/", response_model=PostResponse)
async def create_post(post: PostCreate, db: Session = Depends(get_db)):
    """Create a new post"""
    db_post = Post(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing post"""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    for key, value in post_update.dict(exclude_unset=True).items():
        setattr(db_post, key, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post

@router.delete("/{post_id}")
async def delete_post(post_id: str, db: Session = Depends(get_db)):
    """Delete a post"""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db.delete(db_post)
    db.commit()
    return {"message": "Post deleted successfully"}

