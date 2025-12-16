from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
from app.lib.s3 import upload_file_to_s3, delete_file_from_s3
from app.lib.firebase_auth import verify_firebase_token
from PIL import Image
import io

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
    Images are automatically resized (max 1920px width) and converted to WebP.
    
    Args:
        file: Image file to upload
        bucket: Optional bucket name (defaults to S3_IMAGES_BUCKET)
    
    Returns:
        Public S3 URL of the uploaded image
    """
    import os
    print(f"[Upload] Received upload request - filename: {file.filename}, content_type: {file.content_type}")
    
    # Validate file type
    allowed_image_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    is_image = file.content_type.startswith('image/')
    is_audio = file.content_type.startswith('audio/')
    is_video = file.content_type.startswith('video/')
    is_application = file.content_type.startswith('application/')  # pdf, etc.

    if not is_image and not is_audio and not is_video and not is_application:
        print(f"[Upload] Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=415,
            detail=f"Invalid file type '{file.content_type}'. Allowed types: image/*, audio/*, video/*, application/*"
        )

    # Read file content
    try:
        print("[Upload] Reading file content...")
        file_content = await file.read()
        print(f"[Upload] Original file size: {len(file_content)} bytes")
        
        # Validate file size (max 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        if len(file_content) > max_size:
            file_size_mb = len(file_content) / (1024 * 1024)
            max_size_mb = max_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File size ({file_size_mb:.2f}MB) exceeds {max_size_mb}MB limit"
            )
        
        final_content = file_content
        final_filename = file.filename
        final_content_type = file.content_type

        # Optimize Image if it's an image
        if is_image:
            try:
                print("[Upload] Optimizing image...")
                img = Image.open(io.BytesIO(file_content))
                
                # Convert to RGB if needed (e.g. for PNGs with transparency if we wanted to drop it, but WebP supports it)
                # WebP supports RGBA, so we can keep it usually. But if it's CMYK etc, convert.
                if img.mode in ('CMYK', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large (max width 1920)
                max_width = 1920
                if img.width > max_width:
                    ratio = max_width / img.width
                    new_height = int(img.height * ratio)
                    print(f"[Upload] Resizing from {img.width}x{img.height} to {max_width}x{new_height}")
                    img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
                # Convert to WebP
                output_buffer = io.BytesIO()
                img.save(output_buffer, format='WEBP', quality=85, optimize=True)
                final_content = output_buffer.getvalue()
                
                # Update metadata
                original_ext = os.path.splitext(file.filename)[1]
                final_filename = file.filename.replace(original_ext, '.webp')
                final_content_type = 'image/webp'
                
                print(f"[Upload] Optimized size: {len(final_content)} bytes")
                
            except Exception as e:
                print(f"[Upload] Optimization failed: {str(e)}. Falling back to original.")
                # Fallback to original content if optimization fails
                final_content = file_content

        # Upload to S3
        print("[Upload] Uploading to S3...")
        public_url = upload_file_to_s3(
            file_content=final_content,
            file_name=final_filename or 'image.webp',
            content_type=final_content_type,
            bucket_name=bucket,
            folder=folder
        )
        print(f"[Upload] Success! URL: {public_url}")
        
        return {
            "url": public_url,
            "filename": final_filename,
            "size": len(final_content),
            "content_type": final_content_type
        }
    except HTTPException as he:
        raise
    except Exception as e:
        print(f"[Upload] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )
