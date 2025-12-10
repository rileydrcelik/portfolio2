from app.database import SessionLocal
from sqlalchemy import text

def update_schema():
    db = SessionLocal()
    try:
        print("Executing schema update...")
        # Postgres syntax to drop not null constraint
        sql = text("ALTER TABLE posts ALTER COLUMN description DROP NOT NULL;")
        db.execute(sql)
        db.commit()
        print("Schema updated successfully: 'description' column is now nullable.")
    except Exception as e:
        print(f"Error updating schema: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_schema()
