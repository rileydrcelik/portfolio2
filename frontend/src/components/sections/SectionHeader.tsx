'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Filter } from 'lucide-react';
import Link from 'next/link';

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
  tags?: string[];
  activeTag?: string;
  onTagChange?: (tag: string) => void;
  categorySlug?: string;
}

export default function SectionHeader({
  title,
  totalCount,
  albums,
  activeAlbum,
  onAlbumChange,
  tags = [],
  activeTag = '',
  onTagChange,
  categorySlug,
}: SectionHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get the active album info
  const activeAlbumInfo = albums.find(album => album.id === activeAlbum);
  const formatName = (value?: string | null) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'undefined') return '';
    if (trimmed === 'all') return 'all';
    return trimmed.replace(/[-_]/g, ' ');
  };
  const formattedAlbumName = formatName(activeAlbumInfo?.name || activeAlbumInfo?.id || activeAlbum);
  const formattedAlbumCount = activeAlbumInfo?.count ?? 0;

  return (
    <div className="pl-4 pr-4 py-8 bg-black">
      <div className="max-w-6xl">
        {/* Main Title with Tag Filter */}
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-4xl text-white">
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
                {activeAlbum === 'all'
                  ? ` - ${totalCount} posts`
                  : formattedAlbumName
                    ? ` - ${formattedAlbumName} - ${formattedAlbumCount} posts`
                    : ` - ${formattedAlbumCount} posts`}
              </motion.span>
            </AnimatePresence>
          </h1>

          {/* Tag Filter Dropdown */}
          {tags.length > 0 && onTagChange && (
            <div className="relative flex items-center">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="group cursor-pointer p-0 bg-transparent border-none outline-none"
              >
                <Filter className="w-5 h-5 text-white transition-opacity group-hover:opacity-60 translate-y-1" />
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[160px] bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                    >
                      <button
                        onClick={() => {
                          onTagChange('');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-center transition-colors border-b border-white/10 ${activeTag === '' ? 'text-white bg-white/10 font-medium' : 'text-white/70 hover:bg-white/5'}`}
                      >
                        All tags
                      </button>
                      {tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            onTagChange(tag);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-center transition-colors ${activeTag === tag ? 'text-white bg-white/10 font-medium' : 'text-white/70 hover:bg-white/5'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Album Filter Links */}
        <motion.div
          className="flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {categorySlug ? (
            <Link
              href={`/${categorySlug}`}
              onClick={(e) => {
                onAlbumChange('all');
              }}
              className={`text-white hover:text-gray-300 transition-colors pb-1 ${activeAlbum === 'all' ? 'border-b-2 border-white' : ''
                }`}
            >
              all
            </Link>
          ) : (
            <button
              onClick={() => onAlbumChange('all')}
              className={`text-white hover:text-gray-300 transition-colors pb-1 ${activeAlbum === 'all' ? 'border-b-2 border-white' : ''
                }`}
            >
              all
            </button>
          )}
          {albums.map((album) => {
            const displayName = formatName(album.name) || formatName(album.id) || album.id || '';
            const isActive = activeAlbum === album.id;
            const commonClass = `text-white hover:text-gray-300 transition-colors pb-1 ${isActive ? 'border-b-2 border-white' : ''
              }`;
            const href = categorySlug ? `/${categorySlug}/${album.id}` : undefined;
            return href ? (
              <Link
                key={album.id}
                href={href}
                onClick={() => onAlbumChange(album.id)}
                className={commonClass}
              >
                {displayName}
              </Link>
            ) : (
              <button
                key={album.id}
                onClick={() => onAlbumChange(album.id)}
                className={commonClass}
              >
                {displayName}
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
