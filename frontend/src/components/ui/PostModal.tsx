'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPost } from '@/lib/api';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const subjects = [
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'photo', name: 'Photography', icon: '📸' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'projects', name: 'Projects', icon: '💻' },
  { id: 'bio', name: 'Bio', icon: '👤' },
];

const albums = {
  art: [
    { id: 'pencil_album', name: 'studies' },
    { id: 'pieces_album', name: 'illustration' },
    { id: 'portraits_album', name: 'portraits' },
    { id: 'sketchbook_album', name: 'sketchbook' },
    { id: 'studies_album', name: 'studies' },
  ],
  photo: [
    { id: 'hackharvard', name: 'hackharvard' },
    { id: 'hackknight', name: 'hackknight' },
    { id: 'mhacks', name: 'mhacks' },
  ],
  music: [
    { id: 'beats', name: 'Beats' },
    { id: 'singles', name: 'Singles' },
  ],
  projects: [
    { id: 'robotics', name: 'Robotics' },
    { id: 'apps', name: 'Apps' },
    { id: 'ai_data_science', name: 'AI/Data Science' },
    { id: 'webdev', name: 'Web Dev' },
    { id: 'design', name: 'Design' },
    { id: 'software_other', name: 'Software (Other)' },
  ],
  bio: [
    { id: 'quote_of_the_day', name: 'Quote of the day' },
    { id: 'new_music', name: 'New music' },
    { id: 'rankings', name: 'Rankings' },
    { id: 'bio', name: 'Bio' },
    { id: 'resume', name: 'Resume' },
  ],
};

// Helper function to get current datetime in EST/EDT formatted for datetime-local input
const getCurrentESTDateTime = (): string => {
  const now = new Date();
  
  // Convert to EST/EDT timezone (America/New_York handles DST automatically)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentImage, setContentImage] = useState<File | null>(null);
  const [contentImagePreview, setContentImagePreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [date, setDate] = useState(getCurrentESTDateTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedAlbum(''); // Reset album selection
  };

  const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
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
          
          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setContentImage(file);
      
      // Create full preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setContentImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Create compressed thumbnail for minor tiles only
      // Minor tiles: minor-square (2x2), minor-portrait (2x3), minor-landscape (3x2)
      // For a typical ~1200px container: unitWidth ≈ 119px
      // Minor tiles max width: 3 units ≈ 357px (3 * 119px)
      // Size thumbnail to accommodate minor tiles with buffer for quality
      try {
        // Use 400px max dimension - appropriate for minor tiles (2-3 units wide)
        const compressedThumbnail = await compressImage(file, 400, 400, 0.75);
        setThumbnailPreview(compressedThumbnail);
      } catch (err) {
        console.error('Error compressing image:', err);
        // Fallback to full image if compression fails
        reader.onloadend = () => {
          setThumbnailPreview(reader.result as string);
        };
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!contentImage) {
        setError('Please upload a content image');
        setIsSubmitting(false);
        return;
      }

      // Map subject to category (some naming differences)
      const category = selectedSubject === 'photo' ? 'photo' : selectedSubject;
      
      // For now, we'll convert the image to a data URL or base64
      // In production, this would be uploaded to S3 first
      const contentImageUrl = contentImagePreview || '';
      
      const postData = {
        category,
        album: selectedAlbum,
        title,
        description,
        content_url: contentImageUrl, // Using preview URL for now
        thumbnail_url: thumbnailPreview || contentImageUrl, // Use compressed thumbnail
        date: new Date(date).toISOString(),
      };

      const newPost = await createPost(postData);
      console.log('Post created:', newPost);
      
      // Reset form and close
      setSelectedSubject('');
      setSelectedAlbum('');
      setTitle('');
      setDescription('');
      setContentImage(null);
      setContentImagePreview('');
      setThumbnailPreview('');
      setDate(getCurrentESTDateTime());
      onClose();
      
      // Optionally refresh the page or trigger a refetch
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating post:', err);
    } finally {
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

                  {/* Content Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Content Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/20 file:text-white hover:file:bg-white/30"
                      required
                    />
                    {contentImagePreview && (
                      <div className="mt-3">
                        <img
                          src={contentImagePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-64 rounded-lg border border-white/20"
                        />
                      </div>
                    )}
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
                      disabled={!selectedSubject || !selectedAlbum || !title || !description || !contentImage || isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Post'}
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
