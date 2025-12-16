'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus } from 'lucide-react';
import {
  PaintBrushIcon,
  CameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  UserIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  PaperClipIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { createPost, uploadImage, getAlbumsByCategory, createAlbum, type PostCreate } from '@/lib/api';
import MarkdownEditor from './MarkdownEditor';
import { useAuth } from '@/providers/AuthProvider';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const subjects = [
  { id: 'art', name: 'Art', icon: PaintBrushIcon },
  { id: 'photo', name: 'Photography', icon: CameraIcon },
  { id: 'music', name: 'Music', icon: MusicalNoteIcon },
  { id: 'projects', name: 'Projects', icon: CodeBracketIcon },
  { id: 'bio', name: 'Bio', icon: UserIcon },
  { id: 'shop', name: 'Shop', icon: ShoppingBagIcon },
];


// Helper function to get current EST/EDT datetime
function getCurrentESTDateTime(): string {
  const now = new Date();
  // Convert to EST/EDT (UTC-5 or UTC-4)
  const estOffset = -5 * 60; // EST is UTC-5
  const edtOffset = -4 * 60; // EDT is UTC-4
  // Simple check: EDT is roughly March-November
  const month = now.getUTCMonth();
  const isEDT = month >= 2 && month <= 10; // March (2) to November (10)
  const offset = isEDT ? edtOffset : estOffset;

  const estDate = new Date(now.getTime() + offset * 60 * 1000);

  // Format as datetime-local string (YYYY-MM-DDTHH:mm)
  const year = estDate.getUTCFullYear();
  const monthStr = String(estDate.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(estDate.getUTCDate()).padStart(2, '0');
  const hoursStr = String(estDate.getUTCHours()).padStart(2, '0');
  const minutesStr = String(estDate.getUTCMinutes()).padStart(2, '0');

  return `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}`;
}

const compressImageFile = (file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number; forceSquare?: boolean }): Promise<File> => {
  const { maxWidth = 1000, maxHeight = 1000, quality = 0.7, forceSquare = false } = options || {};

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      let { width, height } = image;
      let sx = 0;
      let sy = 0;
      let drawWidth = width;
      let drawHeight = height;

      if (forceSquare) {
        const size = Math.min(width, height);
        sx = Math.floor((width - size) / 2);
        sy = Math.floor((height - size) / 2);
        drawWidth = size;
        drawHeight = size;
      }

      const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight, 1);
      const targetWidth = Math.round(drawWidth * scale);
      const targetHeight = Math.round(drawHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(image, sx, sy, drawWidth, drawHeight, 0, 0, targetWidth, targetHeight);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Failed to generate thumbnail blob'));
          return;
        }
        const thumbnailName = `${file.name.replace(/\.[^/.]+$/, '')}-thumb.jpg`;
        const thumbnailFile = new File([blob], thumbnailName, { type: 'image/jpeg' });
        resolve(thumbnailFile);
      }, 'image/jpeg', quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };
    image.src = objectUrl;
  });
};

const compressArticleImage = (file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }): Promise<File> => {
  const { maxWidth = 720, maxHeight = 720, quality = 0.85 } = options || {};

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      let { width, height } = image;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }
        const extension = file.name.split('.').pop() || 'jpg';
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const safeBase = baseName.replace(/[^a-zA-Z0-9-_]+/g, '-');
        const finalName = `${safeBase}-compressed.${extension}`;
        const compressedFile = new File([blob], finalName, {
          type: blob.type || 'image/jpeg',
        });
        resolve(compressedFile);
      }, 'image/jpeg', quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };
    image.src = objectUrl;
  });
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve((event.target?.result as string) || '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState('text'); // 'text', 'photo', 'audio', 'video', 'file'
  const [contentUrl, setContentUrl] = useState('');
  const [contentImagePreview, setContentImagePreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [date, setDate] = useState(getCurrentESTDateTime());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isMajor, setIsMajor] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [audioPreviewName, setAudioPreviewName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const isMusic = selectedSubject === 'music';
  const isShop = selectedSubject === 'shop';
  const isFilePost = selectedSubject === 'bio' && postType === 'file';
  const [articleContent, setArticleContent] = useState('');
  const [isArticleImageUploading, setIsArticleImageUploading] = useState(false);
  const [splashImageFile, setSplashImageFile] = useState<File | null>(null);
  const [splashImagePreview, setSplashImagePreview] = useState<string>('');
  const [price, setPrice] = useState('');
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const { token: authToken } = useAuth();

  // Album management
  const [albumNames, setAlbumNames] = useState<string[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Fetch unique albums from posts table when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      const fetchAlbums = async () => {
        setIsLoadingAlbums(true);
        try {
          const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
          console.log('[PostModal] Fetching unique albums for category:', category);
          const albums = await getAlbumsByCategory(category);
          console.log('[PostModal] Fetched albums:', albums);
          setAlbumNames(albums || []);
        } catch (err) {
          console.error('[PostModal] Error fetching albums:', err);
          // On error, just show empty array
          setAlbumNames([]);
        } finally {
          setIsLoadingAlbums(false);
        }
      };
      fetchAlbums();
    } else {
      setAlbumNames([]);
    }
  }, [selectedSubject]);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedAlbum(''); // Reset album selection
    setShowCreateAlbum(false);
    setNewAlbumName('');
    setContentFile(null);
    setThumbnailFile(null);
    setContentImagePreview('');
    setThumbnailPreview('');
    setAudioPreviewName('');
    setContentUrl('');
    setSplashImageFile(null);
    setSplashImagePreview('');
    setArticleContent('');
    setPrice('');
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setPrice('');
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setIsActive(false);
    // Reset post type based on subject
    if (subjectId === 'bio') {
      setPostType('text');
    } else {
      setPostType('photo'); // Default for others roughly, though subject logic handles most
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !selectedSubject) return;

    setIsCreatingAlbum(true);
    setError(null);

    if (!authToken) {
      setError('You must be signed in to create a new album.');
      setIsCreatingAlbum(false);
      return;
    }

    try {
      // Try to create in database
      const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
      const newAlbum = await createAlbum({
        category,
        name: newAlbumName.trim(),
      }, authToken);

      // Add to albums list and select it
      const albumSlug = newAlbum.slug || newAlbumName.trim().toLowerCase().replace(/\s+/g, '-');
      if (!albumNames.includes(albumSlug)) {
        setAlbumNames([...albumNames, albumSlug].sort());
      }
      setSelectedAlbum(albumSlug);
      setShowCreateAlbum(false);
      setNewAlbumName('');
    } catch (err) {
      // If creation fails, just add locally
      const albumSlug = newAlbumName.trim().toLowerCase().replace(/\s+/g, '-');
      if (!albumNames.includes(albumSlug)) {
        setAlbumNames([...albumNames, albumSlug].sort());
      }
      setSelectedAlbum(albumSlug);
      setShowCreateAlbum(false);
      setNewAlbumName('');
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleArticleImageUpload = async (file: File): Promise<string> => {
    setIsArticleImageUploading(true);
    try {
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        try {
          uploadFile = await compressArticleImage(file);
        } catch (compressionErr) {
          console.warn('[PostModal] Article image compression failed, using original file:', compressionErr);
        }
      }

      const folder = selectedSubject === 'photo' ? 'photography' : 'art';
      if (!authToken) {
        throw new Error('You must be signed in to upload images.');
      }

      const uploadResult = await uploadImage(uploadFile, folder, authToken);
      return uploadResult.url;
    } catch (err) {
      console.error('[PostModal] Article image upload failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setIsArticleImageUploading(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // Remove last tag if backspace is pressed on empty input
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  // Generate thumbnail preview from uploaded file
  const generateThumbnailFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        const maxWidth = 400; // Similar to minor tile width
        const maxHeight = 400;

        let width = image.width;
        let height = image.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        // Convert to data URL with compression
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve(thumbnailDataUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for thumbnail generation'));
      };
      image.src = objectUrl;
    });
  };

  const handleContentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setError(null);

    if (isShop) {
      const newFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
      if (newFiles.length === 0) {
        setError('Please upload image files for shop products.');
        return;
      }

      const existingKeys = new Set(galleryFiles.map((f) => `${f.name}-${f.size}`));
      const deduped: File[] = [];
      const previewPromises: Promise<string>[] = [];

      newFiles.forEach((file) => {
        const key = `${file.name}-${file.size}`;
        if (!existingKeys.has(key)) {
          deduped.push(file);
          previewPromises.push(readFileAsDataUrl(file));
        }
      });

      if (deduped.length === 0) {
        return;
      }

      const updatedFiles = [...galleryFiles, ...deduped];
      setGalleryFiles(updatedFiles);

      try {
        const previews = await Promise.all(previewPromises);
        setGalleryPreviews((prev) => [...prev, ...previews]);
      } catch (previewErr) {
        console.warn('[PostModal] Failed to generate gallery preview:', previewErr);
      }

      setContentFile(updatedFiles[0] || null);
      setContentImagePreview('');
      setAudioPreviewName('');
      e.target.value = '';
      return;
    }

    const file = fileList[0];

    if (isMusic) {
      if (!file.type.startsWith('audio/')) {
        setError('Please upload a valid audio file (MP3 recommended).');
        return;
      }
      setContentFile(file);
      setAudioPreviewName(file.name);
      setContentImagePreview('');
      setThumbnailPreview('');
      return;
    }

    if (!file.type.startsWith('image/') && !isFilePost) {
      setError('Please upload an image file.');
      return;
    }

    setContentFile(file);
    setAudioPreviewName('');
    if (!isFilePost) {
      setThumbnailFile(null);
    }

    // Optionally keep a small preview if needed
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setContentImagePreview(result);
      };
      reader.readAsDataURL(file);
    } else {
      setContentImagePreview('');
    }
    e.target.value = '';
  };

  const handleSplashImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the splash hero.');
      return;
    }

    setSplashImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSplashImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setContentFile(updated[0] || null);
      if (selectedSubject === 'shop') {
        setContentImagePreview('');
      }
      return updated;
    });
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleThumbnailFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the thumbnail.');
      return;
    }

    setThumbnailFile(file);
    try {
      const preview = await readFileAsDataUrl(file);
      setThumbnailPreview(preview);
    } catch (previewErr) {
      console.warn('[PostModal] Failed to generate thumbnail preview:', previewErr);
      setThumbnailPreview('');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PostModal] Form submission started');
    setError(null);
    setIsSubmitting(true);

    if (!authToken) {
      setError('You must be signed in to create a post.');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('[PostModal] Validating form data...');
      const isProject = selectedSubject === 'projects';
      const isBio = selectedSubject === 'bio';

      if (!contentFile && !isBio && !isShop) {
        console.error('[PostModal] No file selected');
        setError(isMusic ? 'Please select an audio file' : 'Please upload a cover image');
        setIsSubmitting(false);
        return;
      }

      // Special check for Bio non-text types
      if (isBio && postType !== 'text' && !contentFile) {
        setError(`Please upload a ${postType} file.`);
        setIsSubmitting(false);
        return;
      }

      if (isArticleImageUploading) {
        setError('Please wait for article images to finish uploading.');
        setIsSubmitting(false);
        return;
      }

      if ((isProject || (isBio && postType === 'text')) && !articleContent.trim()) {
        setError(isProject ? 'Project posts need an article before publishing.' : 'Bio blog posts need an article.');
        setIsSubmitting(false);
        return;
      }

      let parsedPrice: number | null = null;
      if (isShop) {
        parsedPrice = price.trim() === '' ? null : Number(price);
        if (parsedPrice === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
          setError('Please provide a valid price for shop items.');
          setIsSubmitting(false);
          return;
        }
        if (galleryFiles.length === 0) {
          setError('Please upload at least one product image.');
          setIsSubmitting(false);
          return;
        }
        if (!thumbnailFile) {
          setError('Please upload a thumbnail image for shop posts.');
          setIsSubmitting(false);
          return;
        }
      }

      // Upload file to S3 first, then get the URL
      let uploadedContentUrl = contentUrl;
      let finalThumbnailUrl = thumbnailPreview || '';
      let uploadedHeroUrl: string | null = null;
      let splashImageUrl = selectedSubject === 'projects' ? finalThumbnailUrl : null;
      let galleryUrls: string[] = [];

      if (isShop) {
        setIsUploading(true);
        try {
          const uploadedGallery: string[] = [];
          for (const file of galleryFiles) {
            let uploadFile = file;
            try {
              uploadFile = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.75 });
            } catch (compressionErr) {
              console.warn('[PostModal] Gallery image compression failed, using original file:', compressionErr);
            }
            if (!authToken) {
              throw new Error('You must be signed in to upload images.');
            }
            const uploadResult = await uploadImage(uploadFile, 'apparel', authToken);
            uploadedGallery.push(uploadResult.url);
            if (!uploadedHeroUrl) {
              uploadedHeroUrl = uploadResult.url;
            }
          }
          galleryUrls = uploadedGallery;
          uploadedContentUrl = uploadedGallery[0] || uploadedContentUrl;
          if (uploadedGallery[0]) {
            setContentUrl(uploadedGallery[0]);
          }

          if (thumbnailFile) {
            try {
              const compressedThumb = await compressImageFile(thumbnailFile, { maxWidth: 800, maxHeight: 800, quality: 0.7, forceSquare: true });
              if (!authToken) {
                throw new Error('You must be signed in to upload images.');
              }
              const thumbnailUpload = await uploadImage(compressedThumb, 'thumbnails', authToken);
              finalThumbnailUrl = thumbnailUpload.url;
            } catch (thumbErr) {
              console.warn('[PostModal] Thumbnail compression failed for shop, uploading original:', thumbErr);
              if (authToken) {
                const fallbackThumbUpload = await uploadImage(thumbnailFile, 'thumbnails', authToken);
                finalThumbnailUrl = fallbackThumbUpload.url;
              } else {
                finalThumbnailUrl = uploadedHeroUrl || finalThumbnailUrl;
              }
            }
          } else if (uploadedGallery[0]) {
            finalThumbnailUrl = uploadedGallery[0];
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload shop images');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      if (!isShop && contentFile && !contentUrl) {
        console.log('[PostModal] Uploading file to S3...');
        setIsUploading(true);
        try {
          if (!authToken) {
            throw new Error('You must be signed in to upload images.');
          }
          const uploadResult = await uploadImage(contentFile, resolvePrimaryFolder(), authToken);
          uploadedHeroUrl = uploadResult.url;
          uploadedContentUrl = uploadResult.url;
          setContentUrl(uploadResult.url);
          console.log('[PostModal] File uploaded successfully:', uploadResult.url);
          if (isMusic) {
            if (!thumbnailFile) {
              throw new Error('Thumbnail image is required for audio posts.');
            }
            console.log('[PostModal] Uploading thumbnail image for audio post...');
            const compressedThumb = await compressImageFile(thumbnailFile, { maxWidth: 800, maxHeight: 800, quality: 0.7, forceSquare: true });
            if (!authToken) {
              throw new Error('You must be signed in to upload images.');
            }
            const thumbnailUpload = await uploadImage(compressedThumb, 'thumbnails', authToken);
            finalThumbnailUrl = thumbnailUpload.url;
            console.log('[PostModal] Thumbnail uploaded successfully:', thumbnailUpload.url);
          } else if (isFilePost) {
            if (!thumbnailFile) {
              throw new Error('Thumbnail image is required for file posts.');
            }
            console.log('[PostModal] Uploading thumbnail image for file post...');
            // Compress thumbnail
            const compressedThumb = await compressImageFile(thumbnailFile, { maxWidth: 1000, maxHeight: 1000, quality: 0.65 });
            if (!authToken) {
              throw new Error('You must be signed in to upload images.');
            }
            const thumbnailUpload = await uploadImage(compressedThumb, 'thumbnails', authToken);
            finalThumbnailUrl = thumbnailUpload.url;
            console.log('[PostModal] Thumbnail uploaded successfully:', thumbnailUpload.url);
          } else {
            try {
              console.log('[PostModal] Compressing image for thumbnail...');
              const compressedFile = await compressImageFile(contentFile, { maxWidth: 1000, maxHeight: 1000, quality: 0.65 });
              if (!authToken) {
                throw new Error('You must be signed in to upload images.');
              }
              const thumbnailUpload = await uploadImage(compressedFile, 'thumbnails', authToken);
              finalThumbnailUrl = thumbnailUpload.url;
              console.log('[PostModal] Thumbnail uploaded successfully:', thumbnailUpload.url);
            } catch (thumbError) {
              console.warn('[PostModal] Thumbnail compression/upload failed, falling back to original image:', thumbError);
              finalThumbnailUrl = uploadResult.url;
            }
          }
        } catch (err) {
          console.error('[PostModal] Upload error:', err);
          setError(err instanceof Error ? err.message : 'Failed to upload image');
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      if (isMajor && splashImageFile) {
        try {
          console.log('[PostModal] Uploading splash image for featured post...');
          if (!authToken) {
            throw new Error('You must be signed in to upload images.');
          }
          const splashUpload = await uploadImage(splashImageFile, 'splash-images', authToken);
          splashImageUrl = splashUpload.url;
        } catch (splashErr) {
          console.warn('[PostModal] Splash image upload failed, falling back to hero:', splashErr);
          splashImageUrl = uploadedHeroUrl || finalThumbnailUrl;
        }
      } else if (isMajor && !splashImageFile) {
        splashImageUrl = uploadedHeroUrl || finalThumbnailUrl;
      }

      if (isProject || (isBio && articleContent.trim())) {
        uploadedContentUrl = articleContent.trim();
      }

      // Final check - make sure we have a content URL
      if (!uploadedContentUrl) {
        setError('Failed to get upload URL. Please try selecting the image again.');
        setIsSubmitting(false);
        return;
      }

      // Map subject to category (some naming differences)
      const category = selectedSubject === 'photo' ? 'photo' : (selectedSubject === 'shop' ? 'apparel' : selectedSubject);

      const postData: PostCreate = {
        category,
        album: selectedAlbum,
        title,
        description: description || '',
        content_url: uploadedContentUrl,
        thumbnail_url: finalThumbnailUrl,
        splash_image_url: splashImageUrl ?? null,
        date: new Date(date).toISOString(),
        tags: tags.length > 0 ? tags : [],
        is_major: isMajor,
        is_active: isActive,
        post_type: selectedSubject === 'bio' ? postType : undefined,
      };

      if (isShop) {
        postData.price = parsedPrice;
        postData.gallery_urls = galleryUrls;
      }

      console.log('[PostModal] Post data prepared:', postData);
      console.log('[PostModal] Calling createPost API...');

      const newPost = await createPost(postData, authToken);
      console.log('[PostModal] Post created successfully:', newPost);

      // Reset form and close
      console.log('[PostModal] Resetting form and closing modal...');
      setSelectedSubject('');
      setSelectedAlbum('');
      setTitle('');
      setDescription('');
      setContentUrl('');
      setContentImagePreview('');
      setThumbnailPreview('');
      setContentFile(null);
      setThumbnailFile(null);
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setTags([]);
      setTagInput('');
      setIsMajor(false);
      setIsActive(false);
      setAudioPreviewName('');
      setArticleContent('');
      setSplashImageFile(null);
      setSplashImagePreview('');
      setPrice('');
      setDate(getCurrentESTDateTime());
      setIsSubmitting(false);
      onClose();

      // Optionally refresh the page or trigger a refetch
      console.log('[PostModal] Reloading page...');
      window.location.reload();
    } catch (err) {
      console.error('[PostModal] Error in form submission:', err);
      console.error('[PostModal] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        error: err
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const resolvePrimaryFolder = () => {
    if (isMusic) return 'audio';
    if (selectedSubject === 'photo') return 'photography';
    if (selectedSubject === 'shop') return 'apparel';

    // Bio specific folders based on post type
    if (selectedSubject === 'bio') {
      if (postType === 'audio') return 'audio';
      if (postType === 'video') return 'videos';
      if (postType === 'file') return 'documents';
      return 'art'; // Default for photo/text images
    }

    return 'art';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl pointer-events-auto text-white">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-2xl font-bold text-white">Create New Post</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-500/20 border border-red-400/50 text-red-200 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Subject Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-3">
                      Select Subject
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {subjects.map((subject) => (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => handleSubjectSelect(subject.id)}
                          className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${selectedSubject === subject.id
                            ? 'border-white bg-white/25 text-white'
                            : 'border-white/20 hover:border-white hover:text-white bg-white/5 text-white/60'
                            }`}
                        >
                          <subject.icon className="w-8 h-8 mb-2" />
                          <div className="text-sm font-medium text-center">{subject.name}</div>
                        </button>
                      ))}
                    </div>
                    {/* Post Type Selection for Bio */}
                    {selectedSubject === 'bio' && (
                      <div className="mt-6 mb-6">
                        <label className="block text-sm font-medium text-white/90 mb-3">
                          Post Type
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { id: 'text', label: 'Blog', icon: DocumentTextIcon },
                            { id: 'photo', label: 'Photo', icon: PhotoIcon },
                            { id: 'audio', label: 'Audio', icon: SpeakerWaveIcon },
                            { id: 'video', label: 'Video', icon: VideoCameraIcon },
                            { id: 'file', label: 'File', icon: PaperClipIcon },
                          ].map((type) => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setPostType(type.id)}
                              className={`p-2 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1 ${postType === type.id
                                ? 'border-white bg-white/20 text-white'
                                : 'border-white/20 hover:border-white/50 bg-white/5 text-white/60'
                                }`}
                            >
                              <type.icon className="w-6 h-6" />
                              <span className="text-xs font-medium">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Album Selection */}

                  {/* Album Selection */}
                  {selectedSubject && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-3">
                        Select Album
                      </label>

                      {isLoadingAlbums ? (
                        <div className="text-white/60 text-sm">Loading albums...</div>
                      ) : (
                        <div className="space-y-2">
                          {/* Existing Albums from Posts */}
                          {albumNames.map((albumSlug) => (
                            <button
                              key={albumSlug}
                              type="button"
                              onClick={() => {
                                setSelectedAlbum(albumSlug);
                                setShowCreateAlbum(false);
                              }}
                              className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${selectedAlbum === albumSlug
                                ? 'border-white bg-white/25 text-white'
                                : 'border-white/20 hover:border-white hover:text-white bg-white/5 text-white/60'
                                }`}
                            >
                              {albumSlug}
                            </button>
                          ))}

                          {/* Create New Album Button */}
                          {!showCreateAlbum && (
                            <button
                              type="button"
                              onClick={() => setShowCreateAlbum(true)}
                              className="w-full p-3 rounded-lg border-2 border-dashed border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Create New Album
                            </button>
                          )}

                          {/* Create New Album Input */}
                          {showCreateAlbum && (
                            <div className="p-3 rounded-lg border-2 border-white/30 bg-white/10 space-y-2">
                              <input
                                type="text"
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                placeholder="Enter album name..."
                                className="w-full p-2 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateAlbum();
                                  } else if (e.key === 'Escape') {
                                    setShowCreateAlbum(false);
                                    setNewAlbumName('');
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleCreateAlbum}
                                  disabled={!newAlbumName.trim() || isCreatingAlbum}
                                  className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {isCreatingAlbum ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCreateAlbum(false);
                                    setNewAlbumName('');
                                  }}
                                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}


                  {(selectedSubject === 'music' || selectedSubject === 'shop' || isFilePost) && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        {selectedSubject === 'music'
                          ? 'Thumbnail Image (1:1)'
                          : isFilePost
                            ? 'Thumbnail Image'
                            : 'Shop Thumbnail (1:1 recommended)'}
                      </label>
                      <div className="mb-3">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {thumbnailFile ? (
                              <>
                                <Upload className="w-8 h-8 text-white mb-2" />
                                <p className="text-sm text-white">{thumbnailFile.name}</p>
                                <p className="text-xs text-white/60 mt-1">Click to change</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-white/60 mb-2" />
                                <p className="text-sm text-white/80">
                                  {selectedSubject === 'music'
                                    ? 'Click to upload image thumbnail'
                                    : isFilePost
                                      ? 'Click to upload thumbnail'
                                      : 'Click to upload product thumbnail'}
                                </p>
                                <p className="text-xs text-white/60 mt-1">Square image recommended</p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleThumbnailFileSelect}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                      {thumbnailPreview && (
                        <div className="mt-3">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="max-w-full h-auto max-h-40 rounded-lg border border-white/20 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      {selectedSubject === 'music'
                        ? 'Audio Upload'
                        : selectedSubject === 'projects'
                          ? 'Thumbnail Upload'
                          : selectedSubject === 'shop'
                            ? 'Product Gallery Images'
                            : isFilePost
                              ? 'File Upload'
                              : selectedSubject === 'bio'
                                ? 'Thumbnail Upload'
                                : 'Image Upload'}
                    </label>

                    {/* File Upload */}
                    <div className="mb-3">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {isUploading ? (
                            <>
                              <Upload className="w-8 h-8 text-white/60 mb-2 animate-pulse" />
                              <p className="text-sm text-white/80">Uploading...</p>
                            </>
                          ) : contentFile ? (
                            <>
                              <Upload className="w-8 h-8 text-white mb-2" />
                              <p className="text-sm text-white">{contentFile.name}</p>
                              <p className="text-xs text-white/60 mt-1">Click to change</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-white/60 mb-2" />
                              <p className="text-sm text-white/80">
                                {selectedSubject === 'projects'
                                  ? 'Click to upload project thumbnail'
                                  : selectedSubject === 'music'
                                    ? 'Click to upload or drag and drop audio'
                                    : selectedSubject === 'shop'
                                      ? 'Click to upload one or more product photos'
                                      : isFilePost
                                        ? 'Click to upload file'
                                        : 'Click to upload or drag and drop'}
                              </p>
                              <p className="text-xs text-white/60 mt-1">
                                {selectedSubject === 'music'
                                  ? 'MP3 up to 100MB'
                                  : selectedSubject === 'projects'
                                    ? 'PNG, JPG up to 10MB • Square or 3:2 recommended'
                                    : selectedSubject === 'shop'
                                      ? 'PNG, JPG up to 10MB • Add multiple angles'
                                      : isFilePost
                                        ? 'Any file type up to 100MB'
                                        : 'PNG, JPG, GIF up to 100MB'}
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept={isMusic ? 'audio/*' : isFilePost ? '*/*' : 'image/*'}
                          multiple={isShop}
                          onChange={handleContentFileSelect}
                          disabled={isUploading}
                        />
                      </label>
                    </div>

                    {selectedSubject !== 'music' && !isShop && contentImagePreview && (
                      <div className="mt-3">
                        <img
                          src={contentImagePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-64 rounded-lg border border-white/20"
                          onError={() => setContentImagePreview('')}
                        />
                      </div>
                    )}

                    {/* For actual files without image preview */}
                    {isFilePost && contentFile && !contentImagePreview && (
                      <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-white/60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{contentFile.name}</p>
                          <p className="text-xs text-white/50">{(contentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    )}
                    {selectedSubject === 'music' && audioPreviewName && (
                      <div className="mt-3 text-sm text-white/80">
                        <p>{audioPreviewName}</p>
                      </div>
                    )}

                    {isShop && galleryPreviews.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-white/70 mb-2">Gallery Preview</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {galleryPreviews.map((preview, index) => (
                            <div key={`${preview}-${index}`} className="relative group">
                              <img
                                src={preview}
                                alt={`Gallery ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-white/20"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(index)}
                                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Thumbnail preview hidden intentionally */}
                  </div>

                  {isMajor && selectedSubject === 'projects' && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Splash Hero Image (featured on home splash)
                      </label>
                      <p className="text-xs text-white/60 mb-3">Upload a high-resolution image for the splash screen. Defaults to thumbnail if not provided.</p>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-white/60 mb-2" />
                          <p className="text-sm text-white/80">Click to upload splash hero image</p>
                          <p className="text-xs text-white/60 mt-1">PNG, JPG up to 10MB • Horizontal recommended</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleSplashImageSelect}
                          disabled={isUploading}
                        />
                      </label>
                      {splashImagePreview && (
                        <div className="mt-3">
                          <img
                            src={splashImagePreview}
                            alt="Splash preview"
                            className="max-w-full h-auto max-h-64 rounded-lg border border-white/20"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                      placeholder="Enter post title..."
                      required
                    />
                  </div>

                  {isShop && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Price (USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                        placeholder="e.g. 39.99"
                        required
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                      placeholder="Enter post description..."
                    />
                  </div>

                  {(selectedSubject === 'projects' || (selectedSubject === 'bio' && postType === 'text')) && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-1">
                          {selectedSubject === 'projects' ? 'Project Article' : 'Bio Entry'}
                        </label>
                        <p className="text-xs text-white/60 mb-3">
                          {selectedSubject === 'projects'
                            ? 'Craft the full write-up for this project. Use the toolbar to add headings, links, code blocks, and inline images (uploaded straight to S3).'
                            : 'Share text for this bio post. You can embed links and images with the toolbar.'}
                        </p>
                      </div>
                      <MarkdownEditor
                        value={articleContent}
                        onChange={setArticleContent}
                        onUploadImage={handleArticleImageUpload}
                        placeholder="Share the story behind this project, the challenges you solved, and anything you learned along the way..."
                      />
                      <p className="text-xs text-white/50">
                        Tip: the editor supports full Markdown (including tables and checklists) and uploads inline images to your S3 bucket.
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Tags (technology, techniques, emotions, etc.)
                    </label>
                    <div className="space-y-2">
                      {/* Tag Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Enter a tag and press Enter"
                          className="flex-1 p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                      </div>

                      {/* Tag Chips */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 border border-white/30 rounded-full text-sm text-white"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-white/60 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Project Toggle */}
                  {selectedSubject === 'projects' && (
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex-1">
                        <label htmlFor="isActive" className="text-white font-medium block mb-1">
                          Active Project
                        </label>
                        <p className="text-sm text-white/60">
                          Mark this project as currently active/in-progress
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        onClick={() => setIsActive(!isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${isActive ? 'bg-green-500' : 'bg-white/20'
                          }`}
                      >
                        <span
                          className={`${isActive ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Major Post Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex-1">
                      <label htmlFor="isMajor" className="text-white font-medium block mb-1">
                        Featured Post
                      </label>
                      <p className="text-sm text-white/60">
                        Mark this as a major/featured post (larger tile)
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isMajor}
                      onClick={() => setIsMajor(!isMajor)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${isMajor ? 'bg-blue-500' : 'bg-white/20'
                        }`}
                    >
                      <span
                        className={`${isMajor ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Date
                    </label>
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !selectedSubject ||
                        !selectedAlbum ||
                        !title ||
                        (!contentFile && selectedSubject !== 'bio' && selectedSubject !== 'shop') ||
                        (selectedSubject === 'projects' && !articleContent.trim()) ||
                        (selectedSubject === 'bio' && !contentFile && !articleContent.trim()) ||
                        ((isMusic || isShop || isFilePost) && !thumbnailFile) ||
                        (isShop && price.trim() === '') ||
                        (isShop && galleryFiles.length === 0) ||
                        isSubmitting ||
                        isUploading ||
                        isArticleImageUploading
                      }
                      className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : isUploading ? 'Uploading...' : 'Create Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
