'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const subjects = [
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'projects', name: 'Projects', icon: '💻' },
  { id: 'apparel', name: 'Apparel', icon: '👕' },
];

const albums = {
  art: [
    { id: 'portraits', name: 'Portraits' },
    { id: 'anime', name: 'Anime' },
    { id: 'pencil', name: 'Pencil' },
  ],
  photography: [
    { id: 'nature', name: 'Nature' },
    { id: 'urban', name: 'Urban' },
    { id: 'portraits', name: 'Portraits' },
  ],
  music: [
    { id: 'electronic', name: 'Electronic Dreams' },
    { id: 'acoustic', name: 'Acoustic Sessions' },
    { id: 'experimental', name: 'Experimental Sounds' },
  ],
  projects: [
    { id: 'web', name: 'Web Applications' },
    { id: 'mobile', name: 'Mobile Apps' },
    { id: 'open-source', name: 'Open Source' },
  ],
  apparel: [
    { id: 'tshirts', name: 'T-Shirts' },
    { id: 'hoodies', name: 'Hoodies' },
    { id: 'posters', name: 'Posters' },
  ],
};

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedAlbum(''); // Reset album selection
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Creating post:', {
      subject: selectedSubject,
      album: selectedAlbum,
      title,
      description,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent as={motion.div}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        maxW="md"
        mx={4}
      >
        <ModalHeader>
          Create New Post
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Subject
              </label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleSubjectSelect(subject.id)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedSubject === subject.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{subject.icon}</div>
                    <div className="text-sm font-medium">{subject.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Album Selection */}
            {selectedSubject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
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
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter post title..."
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter post description..."
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSubject || !selectedAlbum || !title || !description}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Create Post
              </button>
            </div>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
