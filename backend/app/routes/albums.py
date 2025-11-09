from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.album import Album
from app.models.post import Post
from app.schemas.album import AlbumCreate, AlbumUpdate, AlbumResponse
import re
from app.lib.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/api/albums", tags=["albums"])

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

@router.get("/", response_model=List[AlbumResponse])
async def get_albums(
    subject_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all albums, optionally filtered by subject_id"""
    query = db.query(Album)
    if subject_id:
        query = query.filter(Album.subject_id == subject_id)
    albums = query.order_by(Album.name).all()
    return albums

@router.get("/{album_id}", response_model=AlbumResponse)
async def get_album(album_id: str, db: Session = Depends(get_db)):
    """Get a single album by ID"""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album

@router.post("/", response_model=AlbumResponse)
async def create_album(album: AlbumCreate, db: Session = Depends(get_db), current_user=Depends(verify_firebase_token)):
    """Create a new album"""
    # Check if album with same slug already exists for this subject
    existing = db.query(Album).filter(
        and_(
            Album.subject_id == album.subject_id,
            Album.slug == album.slug
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Album with slug '{album.slug}' already exists for this subject"
        )
    
    db_album = Album(**album.dict())
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

@router.put("/{album_id}", response_model=AlbumResponse)
async def update_album(
    album_id: str,
    album_update: AlbumUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(verify_firebase_token)
):
    """Update an existing album"""
    db_album = db.query(Album).filter(Album.id == album_id).first()
    if not db_album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    for key, value in album_update.dict(exclude_unset=True).items():
        setattr(db_album, key, value)
    
    db.commit()
    db.refresh(db_album)
    return db_album

@router.delete("/{album_id}")
async def delete_album(album_id: str, db: Session = Depends(get_db), current_user=Depends(verify_firebase_token)):
    """Delete an album (only if no posts reference it)"""
    db_album = db.query(Album).filter(Album.id == album_id).first()
    if not db_album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Check if any posts reference this album
    posts_count = db.query(Post).filter(Post.album == db_album.slug).count()
    if posts_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete album: {posts_count} post(s) reference it"
        )
    
    db.delete(db_album)
    db.commit()
    return {"message": "Album deleted successfully"}

@router.get("/by-category/{category}", response_model=List[AlbumResponse])
async def get_albums_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    """Get albums by category name (e.g., 'art', 'photo', 'music')"""
    try:
        print(f"[Albums] Fetching albums for category: {category}")
        
        # Map category to subject slug
        category_to_slug = {
            'art': 'artwork',
            'photo': 'photography',
            'photography': 'photography',
            'music': 'music',
            'projects': 'projects',
            'apparel': 'apparel',
        }
        
        subject_slug = category_to_slug.get(category.lower(), category.lower())
        print(f"[Albums] Mapped to subject slug: {subject_slug}")
        
        # Get subject_id from subjects table
        result = db.execute(
            text("SELECT id FROM subjects WHERE slug = :slug"),
            {"slug": subject_slug}
        ).first()
        
        if not result:
            print(f"[Albums] No subject found for slug: {subject_slug}")
            return []
        
        subject_id = result[0]
        print(f"[Albums] Found subject_id: {subject_id}")
        
        # Get albums for this subject
        albums = db.query(Album).filter(Album.subject_id == subject_id).order_by(Album.name).all()
        print(f"[Albums] Found {len(albums)} albums")
        return albums
    except Exception as e:
        print(f"[Albums] Error fetching albums: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching albums: {str(e)}")

class CreateAlbumByCategoryRequest(BaseModel):
    category: str
    name: str
    description: Optional[str] = None

@router.post("/create-by-category", response_model=AlbumResponse)
async def create_album_by_category(
    request: CreateAlbumByCategoryRequest,
    db: Session = Depends(get_db),
    current_user=Depends(verify_firebase_token)
):
    """Create a new album by category name (simpler API)"""
    # Map category to subject slug
    category_to_slug = {
        'art': 'artwork',
        'photo': 'photography',
        'photography': 'photography',
        'music': 'music',
        'projects': 'projects',
        'apparel': 'apparel',
    }
    
    subject_slug = category_to_slug.get(request.category.lower(), request.category.lower())
    
    # Get subject_id from subjects table
    result = db.execute(
        text("SELECT id FROM subjects WHERE slug = :slug"),
        {"slug": subject_slug}
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Subject '{request.category}' not found"
        )
    
    subject_id = result[0]
    
    # Generate slug from name
    album_slug = slugify(request.name)
    
    # Check if album with same slug already exists for this subject
    existing = db.query(Album).filter(
        and_(
            Album.subject_id == subject_id,
            Album.slug == album_slug
        )
    ).first()
    
    if existing:
        # Return existing album instead of error
        return existing
    
    # Create new album
    db_album = Album(
        subject_id=subject_id,
        name=request.name,
        slug=album_slug,
        description=request.description
    )
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

