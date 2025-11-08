# Portfolio API Overview

## Base URL
- **Development**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **ReDoc**: `http://localhost:8000/redoc`

## Endpoints

### 1. Root & Health Check

#### `GET /`
**Description**: Check if API is running
**Response**:
```json
{
  "message": "Portfolio API is running"
}
```

#### `GET /health`
**Description**: Health check endpoint
**Response**:
```json
{
  "status": "healthy"
}
```

---

### 2. Posts Endpoints

All post endpoints are under `/api/posts`

#### `GET /api/posts`
**Description**: Get all posts with optional filtering and pagination

**Query Parameters**:
- `category` (optional): Filter by category (`art`, `photo`, `music`, `projects`, `bio`)
- `album` (optional): Filter by album name
- `limit` (optional, default: 100): Maximum number of posts to return
- `offset` (optional, default: 0): Number of posts to skip (for pagination)

**Examples**:
```
GET /api/posts
GET /api/posts?category=art
GET /api/posts?category=art&album=portraits_album
GET /api/posts?category=music&limit=50&offset=0
```

**Response**: Array of Post objects
```json
[
  {
    "id": "uuid-here",
    "category": "art",
    "album": "portraits_album",
    "title": "Portrait Example",
    "description": "A beautiful portrait",
    "content_url": "https://s3.../image.jpg",
    "thumbnail_url": "https://s3.../thumb.jpg",
    "date": "2024-11-08T10:00:00",
    "created_at": "2024-11-08T10:00:00",
    "updated_at": "2024-11-08T10:00:00"
  }
]
```

**Notes**:
- Posts are sorted by `date` in descending order (newest first)
- Both filters can be combined
- Pagination uses `limit` and `offset`

---

#### `GET /api/posts/{post_id}`
**Description**: Get a single post by ID

**Path Parameters**:
- `post_id` (required): UUID of the post

**Example**:
```
GET /api/posts/123e4567-e89b-12d3-a456-426614174000
```

**Response**: Single Post object
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "category": "art",
  "album": "portraits_album",
  "title": "Portrait Example",
  "description": "A beautiful portrait",
  "content_url": "https://s3.../image.jpg",
  "thumbnail_url": "https://s3.../thumb.jpg",
  "date": "2024-11-08T10:00:00",
  "created_at": "2024-11-08T10:00:00",
  "updated_at": "2024-11-08T10:00:00"
}
```

**Error Response** (404):
```json
{
  "detail": "Post not found"
}
```

---

#### `POST /api/posts`
**Description**: Create a new post

**Request Body** (all fields required):
```json
{
  "category": "art",
  "album": "portraits_album",
  "title": "My New Artwork",
  "description": "Description of the artwork",
  "content_url": "https://s3.amazonaws.com/bucket/image.jpg",
  "thumbnail_url": "https://s3.amazonaws.com/bucket/thumb.jpg",
  "date": "2024-11-08T10:00:00"
}
```

**Field Constraints**:
- `category`: Must be one of: `art`, `photo`, `music`, `projects`, `bio`
- `album`: String (max 100 chars)
- `title`: String (max 255 chars)
- `description`: Text (unlimited)
- `content_url`: String (max 500 chars) - S3 URL
- `thumbnail_url`: String (max 500 chars) - S3 URL
- `date`: ISO 8601 datetime string

**Response**: Created Post object (same as GET response)

**Example**:
```bash
curl -X POST "http://localhost:8000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "art",
    "album": "portraits_album",
    "title": "New Portrait",
    "description": "A portrait I created",
    "content_url": "https://s3.../portrait.jpg",
    "thumbnail_url": "https://s3.../portrait_thumb.jpg",
    "date": "2024-11-08T12:00:00"
  }'
```

---

#### `PUT /api/posts/{post_id}`
**Description**: Update an existing post

**Path Parameters**:
- `post_id` (required): UUID of the post

**Request Body** (all fields optional - only include what you want to update):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "date": "2024-11-09T10:00:00"
}
```

**Response**: Updated Post object

**Error Response** (404):
```json
{
  "detail": "Post not found"
}
```

**Example**:
```bash
curl -X PUT "http://localhost:8000/api/posts/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

---

#### `DELETE /api/posts/{post_id}`
**Description**: Delete a post

**Path Parameters**:
- `post_id` (required): UUID of the post

**Response**:
```json
{
  "message": "Post deleted successfully"
}
```

**Error Response** (404):
```json
{
  "detail": "Post not found"
}
```

**Example**:
```bash
curl -X DELETE "http://localhost:8000/api/posts/123e4567-e89b-12d3-a456-426614174000"
```

---

## Data Models

### Post Object
```typescript
{
  id: UUID                    // Auto-generated
  category: string           // art | photo | music | projects | bio
  album: string              // Required album name
  title: string              // Max 255 chars
  description: string        // Text
  content_url: string        // S3 URL (max 500 chars)
  thumbnail_url: string      // S3 URL (max 500 chars)
  date: datetime             // ISO 8601 format
  created_at: datetime       // Auto-generated
  updated_at: datetime       // Auto-updated on changes
}
```

## Testing the API

### Option 1: Swagger UI (Recommended)
1. Start server: `uvicorn app.main:app --reload`
2. Visit: http://localhost:8000/docs
3. Click "Try it out" on any endpoint
4. Fill in parameters and click "Execute"

### Option 2: cURL
Use the examples above in your terminal

### Option 3: Postman
- Import the OpenAPI schema from `/docs`
- Or manually create requests using the examples above

### Option 4: Python requests
```python
import requests

# Get all art posts
response = requests.get("http://localhost:8000/api/posts", params={"category": "art"})
posts = response.json()

# Create a post
new_post = {
    "category": "art",
    "album": "portraits_album",
    "title": "Test Post",
    "description": "Test description",
    "content_url": "https://example.com/image.jpg",
    "thumbnail_url": "https://example.com/thumb.jpg",
    "date": "2024-11-08T10:00:00"
}
response = requests.post("http://localhost:8000/api/posts", json=new_post)
```

## Common Use Cases

### Get all posts in a category
```
GET /api/posts?category=art
```

### Get posts in a specific album
```
GET /api/posts?category=art&album=portraits_album
```

### Pagination (get next 20 posts)
```
GET /api/posts?limit=20&offset=20
```

### Get single post
```
GET /api/posts/{post_id}
```

