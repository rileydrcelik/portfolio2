import boto3
from botocore.exceptions import ClientError
import os
from typing import Optional
from urllib.parse import urlparse
import uuid

def get_s3_client():
    """Initialize and return S3 client"""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )

def upload_file_to_s3(
    file_content: bytes,
    file_name: str,
    content_type: str,
    bucket_name: Optional[str] = None,
    folder: Optional[str] = None
) -> str:
    """
    Upload a file to S3 and return the public URL.
    
    Args:
        file_content: File content as bytes
        file_name: Original file name
        content_type: MIME type of the file
        bucket_name: S3 bucket name (defaults to S3_IMAGES_BUCKET env var)
    
    Returns:
        Public S3 URL of the uploaded file
    """
    if not bucket_name:
        bucket_name = os.getenv('S3_IMAGES_BUCKET', 'portfoliowebsite-images')
    
    # Generate unique filename to avoid conflicts
    file_extension = os.path.splitext(file_name)[1] or '.jpg'
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    sanitized_folder = folder.strip().strip('/') if folder else ''
    if sanitized_folder:
        s3_key = f"{sanitized_folder}/{unique_filename}"
    else:
        s3_key = unique_filename
    
    try:
        s3_client = get_s3_client()
        
        # Upload file (bucket is already public, so no ACL needed)
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type
        )
        
        # Generate public URL
        region = os.getenv('AWS_REGION', 'us-east-1')
        public_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
        
        return public_url
    except ClientError as e:
        raise Exception(f"Failed to upload file to S3: {str(e)}")


def delete_file_from_s3(file_url: Optional[str], bucket_name: Optional[str] = None) -> None:
    """Delete an object from S3 using its public URL."""
    if not file_url:
        return

    if not bucket_name:
        bucket_name = os.getenv('S3_IMAGES_BUCKET', 'portfoliowebsite-images')

    parsed = urlparse(file_url)
    if not parsed.netloc:
        return

    s3_host_prefix = f"{bucket_name}.s3"
    # Handles both regional and global S3 endpoints
    if parsed.netloc.startswith(s3_host_prefix):
        object_key = parsed.path.lstrip('/')
    else:
        # Fallback: assume virtual-hosted-style URL with bucket in host
        object_key = parsed.path.lstrip('/')

    if not object_key:
        return

    try:
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket_name, Key=object_key)
    except ClientError as e:
        # Log the error but don't raise to avoid blocking DB deletion
        print(f"[S3] Failed to delete {object_key} from {bucket_name}: {str(e)}")
