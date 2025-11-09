from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from app.routes import posts, upload, albums

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

@app.get("/")
async def root():
    return {"message": "Portfolio API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
