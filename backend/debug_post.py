from app.database import SessionLocal
from app.models.post import Post

def get_post_by_slug(slug):
    db = SessionLocal()
    try:
        post = db.query(Post).filter(Post.slug == slug).first()
        if post:
            print(f"Found Post:")
            print(f"  Title: {post.title}")
            print(f"  Slug: {post.slug}")
            print(f"  Category: '{post.category}'")
            print(f"  Album: '{post.album}'")
        else:
            print(f"Post with slug '{slug}' not found.")
    finally:
        db.close()

if __name__ == "__main__":
    get_post_by_slug("doom")
