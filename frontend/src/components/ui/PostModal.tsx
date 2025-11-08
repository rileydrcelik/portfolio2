'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus } from 'lucide-react';
import { createPost, uploadImage, getAlbumsByCategory, createAlbum } from '@/lib/api';
import MarkdownEditor from './MarkdownEditor';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const subjects = [
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'photo', name: 'Photography', icon: '📸' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'projects', name: 'Projects', icon: '💻' },
  { id: 'apparel', name: 'Apparel', icon: '👕' },
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

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentImagePreview, setContentImagePreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [date, setDate] = useState(getCurrentESTDateTime());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isMajor, setIsMajor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [audioPreviewName, setAudioPreviewName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const isMusic = selectedSubject === 'music';
  const [articleContent, setArticleContent] = useState('');
  const [isArticleImageUploading, setIsArticleImageUploading] = useState(false);
  const [splashImageFile, setSplashImageFile] = useState<File | null>(null);
  const [splashImagePreview, setSplashImagePreview] = useState<string>('');
  
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
  };
  
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !selectedSubject) return;
    
    setIsCreatingAlbum(true);
    setError(null);
    
    try {
      // Try to create in database
      const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
      const newAlbum = await createAlbum({
        category,
        name: newAlbumName.trim(),
      });
      
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
      const uploadResult = await uploadImage(uploadFile, folder);
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
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

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

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    setContentFile(file);
    setAudioPreviewName('');
    setThumbnailFile(null);

    // Optionally keep a small preview if needed
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setContentImagePreview(result);
    };
    reader.readAsDataURL(file);
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

  const handleThumbnailFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the thumbnail.');
      return;
    }

    setThumbnailFile(file);
    // No preview stored for thumbnails
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PostModal] Form submission started');
    setError(null);
    setIsSubmitting(true);

    try {
      console.log('[PostModal] Validating form data...');
      const isProject = selectedSubject === 'projects';

      if (!contentFile) {
        console.error('[PostModal] No file selected');
        setError(isMusic ? 'Please select an audio file' : 'Please upload a cover image');
        setIsSubmitting(false);
        return;
      }

      if (isArticleImageUploading) {
        setError('Please wait for article images to finish uploading.');
        setIsSubmitting(false);
        return;
      }

      if (isProject && !articleContent.trim()) {
        setError('Project posts need an article before publishing.');
        setIsSubmitting(false);
        return;
      }
      
      // Upload file to S3 first, then get the URL
      let uploadedContentUrl = contentUrl;
      let finalThumbnailUrl = thumbnailPreview || '';
      let uploadedHeroUrl: string | null = null;
      let splashImageUrl = selectedSubject === 'projects' ? finalThumbnailUrl : null;
      
      if (contentFile && !contentUrl) {
        console.log('[PostModal] Uploading file to S3...');
        setIsUploading(true);
        try {
          const uploadResult = await uploadImage(contentFile, resolvePrimaryFolder());
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
            const thumbnailUpload = await uploadImage(compressedThumb, 'thumbnails');
            finalThumbnailUrl = thumbnailUpload.url;
            console.log('[PostModal] Thumbnail uploaded successfully:', thumbnailUpload.url);
          } else {
            try {
              console.log('[PostModal] Compressing image for thumbnail...');
              const compressedFile = await compressImageFile(contentFile, { maxWidth: 1000, maxHeight: 1000, quality: 0.65 });
              const thumbnailUpload = await uploadImage(compressedFile, 'thumbnails');
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
          const splashUpload = await uploadImage(splashImageFile, 'splash-images');
          splashImageUrl = splashUpload.url;
        } catch (splashErr) {
          console.warn('[PostModal] Splash image upload failed, falling back to hero:', splashErr);
          splashImageUrl = uploadedHeroUrl || finalThumbnailUrl;
        }
      } else if (isMajor && !splashImageFile) {
        splashImageUrl = uploadedHeroUrl || finalThumbnailUrl;
      }

      if (isProject) {
        uploadedContentUrl = articleContent.trim();
      }

      // Final check - make sure we have a content URL
      if (!uploadedContentUrl) {
        setError('Failed to get upload URL. Please try selecting the image again.');
        setIsSubmitting(false);
        return;
      }

      // Map subject to category (some naming differences)
      const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
      
      const postData = {
        category,
        album: selectedAlbum,
        title,
        description,
        content_url: uploadedContentUrl,
        thumbnail_url: finalThumbnailUrl,
        splash_image_url: splashImageUrl ?? null,
        date: new Date(date).toISOString(),
        tags: tags.length > 0 ? tags : [],
        is_major: isMajor,
      };
      
      console.log('[PostModal] Post data prepared:', postData);
      console.log('[PostModal] Calling createPost API...');
      
      const newPost = await createPost(postData);
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
      setTags([]);
      setTagInput('');
      setIsMajor(false);
      setAudioPreviewName('');
      setArticleContent('');
      setSplashImageFile(null);
      setSplashImagePreview('');
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
                          className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${
                            selectedSubject === subject.id
                              ? 'border-white bg-white/25 text-white'
                              : 'border-white/20 hover:border-white hover:text-white bg-white/5 text-white/60'
                          }`}
                        >
                          <div className="text-2xl mb-1">{subject.icon}</div>
                          <div className="text-sm font-medium text-center">{subject.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

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
                              className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                                selectedAlbum === albumSlug
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

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      {selectedSubject === 'music'
                        ? 'Audio Upload'
                        : selectedSubject === 'projects'
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
                                    : 'Click to upload or drag and drop'}
                              </p>
                              <p className="text-xs text-white/60 mt-1">
                                {selectedSubject === 'music'
                                  ? 'MP3 up to 50MB'
                                  : selectedSubject === 'projects'
                                    ? 'PNG, JPG up to 10MB • Square or 3:2 recommended'
                                    : 'PNG, JPG, GIF up to 50MB'}
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept={isMusic ? 'audio/*' : 'image/*'}
                          onChange={handleContentFileSelect}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                    
                    {selectedSubject !== 'music' && contentImagePreview && (
                      <div className="mt-3">
                        <img
                          src={contentImagePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-64 rounded-lg border border-white/20"
                          onError={() => setContentImagePreview('')}
                        />
                      </div>
                    )}
                    {selectedSubject === 'music' && audioPreviewName && (
                      <div className="mt-3 text-sm text-white/80">
                        <p>{audioPreviewName}</p>
                      </div>
                    )}
                    
                    {/* Thumbnail preview hidden intentionally */}
                  </div>

                  {selectedSubject === 'music' && (
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Thumbnail Image (1:1)
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
                                <p className="text-sm text-white/80">Click to upload image thumbnail</p>
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
                      {/* Thumbnail preview hidden intentionally */}
                    </div>
                  )}

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
                      required
                    />
                  </div>

                  {selectedSubject === 'projects' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-1">
                          Project Article
                        </label>
                        <p className="text-xs text-white/60 mb-3">
                          Craft the full write-up for this project. Use the toolbar to add headings, links, code blocks, and inline images (uploaded straight to S3).
                        </p>
                      </div>
                      <MarkdownEditor
                        value={articleContent}
                        onChange={setArticleContent}
                        onUploadImage={handleArticleImageUpload}
                        placeholder="Share the story behind this project, the challenges you solved, and anything you learned along the way..."
                      />
                      <p className="text-xs text-white/50">
                        Tip: the article supports full Markdown (including tables and checklists) and automatically generates responsive images.
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

                  {/* Major Post Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      id="major-toggle"
                      type="checkbox"
                      checked={isMajor}
                      onChange={(e) => setIsMajor(e.target.checked)}
                      className="w-4 h-4 rounded border border-white/30 bg-white/10 text-white focus:ring-white/50"
                    />
                    <label htmlFor="major-toggle" className="text-sm font-medium text-white/90">
                      Mark as major post
                    </label>
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
                        !description ||
                        !contentFile ||
                        (selectedSubject === 'projects' && !articleContent.trim()) ||
                        (isMusic && !thumbnailFile) ||
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
