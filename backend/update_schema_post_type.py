from app.database import SessionLocal
from sqlalchemy import text

def update_schema():
    db = SessionLocal()
    try:
        print("Executing schema update...")
        # Add post_type column
        sql = text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR;")
        db.execute(sql)
        db.commit()
        print("Schema updated successfully: 'post_type' column added.")
    except Exception as e:
        print(f"Error updating schema: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_schema()
