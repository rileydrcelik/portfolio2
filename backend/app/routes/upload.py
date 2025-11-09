from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
from app.lib.s3 import upload_file_to_s3, delete_file_from_s3
from app.lib.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    bucket: Optional[str] = None,
    folder: Optional[str] = None,
    current_user=Depends(verify_firebase_token)
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
    allowed_image_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    is_image = file.content_type.startswith('image/')
    is_audio = file.content_type.startswith('audio/')

    if not is_image and not is_audio:
        print(f"[Upload] Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=415,
            detail=f"Invalid file type '{file.content_type}'. Allowed image types: {', '.join(allowed_image_types)}. Allowed audio types: audio/*"
        )

    if is_image and file.content_type not in allowed_image_types:
        print(f"[Upload] Uncommon image type (allowing): {file.content_type}")

    if is_audio:
        print(f"[Upload] Audio upload detected with content type: {file.content_type}")
    
    # Read file content
    try:
        print("[Upload] Reading file content...")
        file_content = await file.read()
        print(f"[Upload] File size: {len(file_content)} bytes")
        
        # Validate file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_content) > max_size:
            file_size_mb = len(file_content) / (1024 * 1024)
            max_size_mb = max_size / (1024 * 1024)
            print(f"[Upload] File too large: {file_size_mb:.2f}MB (max: {max_size_mb}MB)")
            raise HTTPException(
                status_code=400,
                detail=f"File size ({file_size_mb:.2f}MB) exceeds {max_size_mb}MB limit"
            )
        
        # Upload to S3
        print("[Upload] Uploading to S3...")
        public_url = upload_file_to_s3(
            file_content=file_content,
            file_name=file.filename or 'image',
            content_type=file.content_type,
            bucket_name=bucket,
            folder=folder
        )
        print(f"[Upload] Success! URL: {public_url}")
        
        return {
            "url": public_url,
            "filename": file.filename,
            "size": len(file_content),
            "content_type": file.content_type
        }
    except HTTPException as he:
        print(f"[Upload] HTTPException: {he.detail}")
        raise
    except Exception as e:
        print(f"[Upload] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        error_detail = str(e)
        print(f"[Upload] Raising HTTPException with detail: {error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {error_detail}"
        )
