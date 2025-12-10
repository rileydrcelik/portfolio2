from app.database import SessionLocal
from app.models.post import Post
import uuid
from datetime import datetime

def verify_optional_description():
    db = SessionLocal()
    try:
        # 1. Create Post with NULL description
        test_slug = f"test-optional-desc-{uuid.uuid4()}"
        new_post = Post(
            category="projects",
            album="test-album",
            title="Test Optional Description",
            description=None,  # Explicitly None
            content_url="http://example.com/content",
            thumbnail_url="http://example.com/thumb",
            date=datetime.now(),
            slug=test_slug,
            is_active=True
        )
        
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        
        print(f"Created post with ID: {new_post.id}")
        
        # 2. Verify
        fetched_post = db.query(Post).filter(Post.id == new_post.id).first()
        if fetched_post.description is None:
            print("SUCCESS: Description is None")
        else:
            print(f"FAILURE: Description is '{fetched_post.description}'")
            
        # 3. Clean up
        db.delete(fetched_post)
        db.commit()
        print("Test post deleted.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_optional_description()
