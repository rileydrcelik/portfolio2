'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Album {
  id: string;
  name: string;
  count: number;
}

interface SectionHeaderProps {
  title: string;
  totalCount: number;
  albums: Album[];
  activeAlbum: string;
  onAlbumChange: (albumId: string) => void;
}

export default function SectionHeader({ 
  title, 
  totalCount, 
  albums, 
  activeAlbum, 
  onAlbumChange 
}: SectionHeaderProps) {
  // Get the active album info
  const activeAlbumInfo = albums.find(album => album.id === activeAlbum);

  return (
    <div className="pl-4 pr-4 py-8 bg-black">
      <div className="max-w-6xl">
        {/* Main Title */}
        <h1 className="text-4xl text-white mb-4">
          <span className="font-bold">{title}</span>
          <AnimatePresence mode="wait">
            <motion.span 
              key={activeAlbum}
              className="font-normal text-2xl"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {activeAlbum === 'all' ? (
                ` - ${totalCount} posts`
              ) : (
                ` - ${activeAlbumInfo?.name} - ${activeAlbumInfo?.count} posts`
              )}
            </motion.span>
          </AnimatePresence>
        </h1>

        {/* Album Filter Links */}
        <motion.div 
          className="flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            onClick={() => onAlbumChange('all')}
            className={`text-white hover:text-gray-300 transition-colors pb-1 ${
              activeAlbum === 'all' ? 'border-b-2 border-white' : ''
            }`}
          >
            all
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onAlbumChange(album.id)}
              className={`text-white hover:text-gray-300 transition-colors pb-1 ${
                activeAlbum === album.id ? 'border-b-2 border-white' : ''
              }`}
            >
              {album.name}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
