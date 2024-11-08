import boto3
from botocore.exceptions import ClientError
import os
from typing import Optional
import uuid
from datetime import datetime

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
    bucket_name: Optional[str] = None
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
    
    # Optional: Organize by date (year/month)
    date_prefix = datetime.now().strftime('%Y/%m')
    s3_key = f"{date_prefix}/{unique_filename}"
    
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
