from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from app.lib.s3 import upload_file_to_s3

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    bucket: Optional[str] = None
):
    """
    Upload an image file to S3 and return the public URL.
    
    Args:
        file: Image file to upload
        bucket: Optional bucket name (defaults to S3_IMAGES_BUCKET)
    
    Returns:
        Public S3 URL of the uploaded image
    """
    import os
    print(f"[Upload] Received upload request - filename: {file.filename}, content_type: {file.content_type}")
    print(f"[Upload] AWS credentials check - ACCESS_KEY_ID: {'SET' if os.getenv('AWS_ACCESS_KEY_ID') else 'NOT SET'}")
    print(f"[Upload] AWS credentials check - SECRET_KEY: {'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET'}")
    print(f"[Upload] Bucket name: {bucket or os.getenv('S3_IMAGES_BUCKET', 'NOT SET')}")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        print(f"[Upload] Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Read file content
    try:
        print("[Upload] Reading file content...")
        file_content = await file.read()
        print(f"[Upload] File size: {len(file_content)} bytes")
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_content) > max_size:
            print(f"[Upload] File too large: {len(file_content)} bytes")
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 10MB limit"
            )
        
        # Upload to S3
        print("[Upload] Uploading to S3...")
        public_url = upload_file_to_s3(
            file_content=file_content,
            file_name=file.filename or 'image',
            content_type=file.content_type,
            bucket_name=bucket
        )
        print(f"[Upload] Success! URL: {public_url}")
        
        return {
            "url": public_url,
            "filename": file.filename,
            "size": len(file_content),
            "content_type": file.content_type
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )
