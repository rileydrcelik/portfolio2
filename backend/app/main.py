from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from app.routes import posts, upload

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Portfolio API",
    description="Backend API for portfolio website",
    version="1.0.0"
)

# CORS middleware (allow frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(posts.router)
app.include_router(upload.router)

@app.get("/")
async def root():
    return {"message": "Portfolio API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
