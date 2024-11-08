'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus } from 'lucide-react';
import { createPost, uploadImage } from '@/lib/api';

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

const albums = {
  art: [
    { id: 'pencil_album', name: 'studies' },
    { id: 'pieces_album', name: 'illustration' },
    { id: 'portraits_album', name: 'portraits' },
    { id: 'sketchbook_album', name: 'sketchbook' },
    { id: 'studies_album', name: 'pencil' },
  ],
  photo: [
    { id: 'hackharvard', name: 'HackHarvard' },
    { id: 'hackknight', name: 'HackKnight' },
    { id: 'mhacks', name: 'MHacks' },
  ],
  music: [
    { id: 'electronic', name: 'Electronic Dreams' },
    { id: 'acoustic', name: 'Acoustic Sessions' },
    { id: 'experimental', name: 'Experimental Sounds' },
  ],
  projects: [
    { id: 'web', name: 'Web Applications' },
    { id: 'mobile', name: 'Mobile Apps' },
    { id: 'design', name: 'Design' },
  ],
  apparel: [
    { id: 'tshirts', name: 'T-Shirts' },
    { id: 'hoodies', name: 'Hoodies' },
    { id: 'posters', name: 'Posters' },
  ],
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedAlbum(''); // Reset album selection
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          const maxWidth = 400; // Similar to minor tile width
          const maxHeight = 400;
          
          let width = img.width;
          let height = img.height;
          
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
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL with compression
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    // Show preview of the uploaded image
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setContentImagePreview(result);
    };
    reader.readAsDataURL(file);

    // Generate thumbnail preview
    try {
      const thumbnailDataUrl = await generateThumbnailFromFile(file);
      setThumbnailPreview(thumbnailDataUrl);
    } catch (err) {
      console.error('Error generating thumbnail:', err);
      // If thumbnail generation fails, just use the original image
      setThumbnailPreview(contentImagePreview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PostModal] Form submission started');
    setError(null);
    setIsSubmitting(true);

    try {
      console.log('[PostModal] Validating form data...');
      if (!selectedFile) {
        console.error('[PostModal] No file selected');
        setError('Please select an image file');
        setIsSubmitting(false);
        return;
      }
      
      // Upload file to S3 first, then get the URL
      let uploadedContentUrl = contentUrl;
      
      if (selectedFile && !contentUrl) {
        console.log('[PostModal] Uploading file to S3...');
        setIsUploading(true);
        try {
          const uploadResult = await uploadImage(selectedFile);
          uploadedContentUrl = uploadResult.url;
          setContentUrl(uploadResult.url);
          console.log('[PostModal] File uploaded successfully:', uploadResult.url);
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
      
      // Final check - make sure we have a content URL
      if (!uploadedContentUrl) {
        setError('Failed to get upload URL. Please try selecting the image again.');
        setIsSubmitting(false);
        return;
      }

      // Map subject to category (some naming differences)
      const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
      
      // Use uploaded URL for both content and thumbnail
      const finalThumbnailUrl = uploadedContentUrl;
      
      const postData = {
        category,
        album: selectedAlbum,
        title,
        description,
        content_url: uploadedContentUrl,
        thumbnail_url: finalThumbnailUrl,
        date: new Date(date).toISOString(),
        tags: tags.length > 0 ? tags : [],
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
      setSelectedFile(null);
      setTags([]);
      setTagInput('');
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
                      <div className="space-y-2">
                        {albums[selectedSubject as keyof typeof albums]?.map((album) => (
                          <button
                            key={album.id}
                            type="button"
                            onClick={() => setSelectedAlbum(album.id)}
                            className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                              selectedAlbum === album.id
                                ? 'border-white bg-white/25 text-white'
                                : 'border-white/20 hover:border-white hover:text-white bg-white/5 text-white/60'
                            }`}
                          >
                            {album.name}
                          </button>
                        ))}
                      </div>
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

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Image Upload
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
                          ) : selectedFile ? (
                            <>
                              <Upload className="w-8 h-8 text-white mb-2" />
                              <p className="text-sm text-white">{selectedFile.name}</p>
                              <p className="text-xs text-white/60 mt-1">Click to change</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-white/60 mb-2" />
                              <p className="text-sm text-white/80">Click to upload or drag and drop</p>
                              <p className="text-xs text-white/60 mt-1">PNG, JPG, GIF up to 10MB</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                    
                    {contentImagePreview && (
                      <div className="mt-3">
                        <img
                          src={contentImagePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-64 rounded-lg border border-white/20"
                          onError={() => setContentImagePreview('')}
                        />
                      </div>
                    )}
                    
                    {thumbnailPreview && (
                      <div className="mt-3">
                        <p className="text-xs text-white/60 mb-2">Thumbnail Preview:</p>
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail Preview"
                          className="max-w-full h-auto max-h-32 rounded-lg border border-white/20"
                          onError={() => setThumbnailPreview('')}
                        />
                      </div>
                    )}
                  </div>

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
                      disabled={!selectedSubject || !selectedAlbum || !title || !description || !selectedFile || isSubmitting || isUploading}
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
