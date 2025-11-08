# Backend

FastAPI backend for the portfolio application.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   # Especially DATABASE_URL with your postgres password
   ```

3. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **View API docs:**
   - Open http://localhost:8000/docs (Swagger UI)
   - Or http://localhost:8000/redoc (ReDoc)

## API Endpoints

### Posts
- `GET /api/posts` - List posts (with filters: category, album)
- `GET /api/posts/{id}` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app
│   ├── database.py        # Database connection
│   ├── models/           # SQLAlchemy models
│   │   └── post.py
│   ├── schemas/          # Pydantic schemas
│   │   └── post.py
│   └── routes/          # API routes
│       └── posts.py
├── database/            # Database schemas
├── requirements.txt     # Python dependencies
└── .env.example        # Environment variables template
```
