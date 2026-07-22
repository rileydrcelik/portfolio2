from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from app.routes import posts, upload, albums, notes_ingest

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Portfolio API",
    description="Backend API for portfolio website",
    version="1.0.0"
)

# CORS middleware (allow frontend to connect)
default_origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    extra_origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    default_origins.extend(extra_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(posts.router)
app.include_router(upload.router)
app.include_router(albums.router)
app.include_router(notes_ingest.router)

@app.exception_handler(RequestValidationError)
async def _log_validation_errors(request: Request, exc: RequestValidationError):
    """Log what was actually rejected. A 422 body is only visible to the caller,
    which makes "it failed" reports impossible to act on without this."""
    body = exc.body
    print(f"[422] {request.method} {request.url.path} errors={exc.errors()} body={body!r}", flush=True)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/")
async def root():
    return {"message": "Portfolio API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
