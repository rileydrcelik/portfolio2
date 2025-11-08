// import AWS from 'aws-sdk';

// Configure AWS S3
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION || 'us-east-1',
// });

// S3 Bucket Configuration
export const s3Config = {
  buckets: {
    images: process.env.S3_IMAGES_BUCKET || 'portfolio-images',
    videos: process.env.S3_VIDEOS_BUCKET || 'portfolio-videos',
    audio: process.env.S3_AUDIO_BUCKET || 'portfolio-audio',
  },
  region: process.env.AWS_REGION || 'us-east-1',
  cloudFrontUrl: process.env.CLOUDFRONT_URL,
};

// Generate signed URL for upload
export const generateSignedUploadUrl = async (
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> => {
  // TODO: Implement when AWS SDK is installed
  throw new Error('AWS SDK not installed');
};

// Generate signed URL for download
export const generateSignedDownloadUrl = async (
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  // TODO: Implement when AWS SDK is installed
  throw new Error('AWS SDK not installed');
};

// Delete object from S3
export const deleteObject = async (bucket: string, key: string): Promise<void> => {
  // TODO: Implement when AWS SDK is installed
  throw new Error('AWS SDK not installed');
};

// Get object metadata
export const getObjectMetadata = async (bucket: string, key: string) => {
  // TODO: Implement when AWS SDK is installed
  throw new Error('AWS SDK not installed');
};

// export default s3;
