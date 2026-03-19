'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

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
  onAlbumsReorder?: (albums: Album[]) => void;
  canReorder?: boolean;
  tags?: { name: string; count: number }[];
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
  onAlbumsReorder,
  canReorder = false,
  tags = [],
  activeTag = '',
  onTagChange,
  categorySlug,
}: SectionHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isDragging = useRef(false);
  const router = useRouter();

  // Separate favorites from draggable albums
  const favoritesAlbum = albums.find(a => a.id === 'favorites');
  const draggableAlbums = albums.filter(a => a.id !== 'favorites');

  const handleReorder = (newOrder: Album[]) => {
    if (onAlbumsReorder) {
      onAlbumsReorder(favoritesAlbum ? [favoritesAlbum, ...newOrder] : newOrder);
    }
  };

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
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[160px] bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-2 border-b border-white/10">
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-white/40"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            onTagChange('');
                            setIsFilterOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full px-3 py-2 text-sm text-center transition-colors border-b border-white/10 ${activeTag === '' ? 'text-white bg-white/10 font-medium' : 'text-white/70 hover:bg-white/5'}`}
                        >
                          All tags
                        </button>
                        {tags
                          .filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(tag => (
                            <button
                              key={tag.name}
                              onClick={() => {
                                onTagChange(tag.name);
                                setIsFilterOpen(false);
                                setSearchQuery('');
                              }}
                              className={`w-full px-3 py-2 text-sm text-center transition-colors ${activeTag === tag.name ? 'text-white bg-white/10 font-medium' : 'text-white/70 hover:bg-white/5'}`}
                            >
                              {tag.name} <span className="text-white/40 ml-1">({tag.count})</span>
                            </button>
                          ))}
                        {tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-center text-white/40 italic">
                            No tags found
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Album Filter Links */}
        <motion.div
          className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* "all" - always first, not draggable */}
          {categorySlug ? (
            <Link
              href={`/${categorySlug}`}
              onClick={() => onAlbumChange('all')}
              className={`shrink-0 whitespace-nowrap text-white hover:text-gray-300 transition-colors pb-1 ${activeAlbum === 'all' ? 'border-b-2 border-white' : ''}`}
            >
              all
            </Link>
          ) : (
            <button
              onClick={() => onAlbumChange('all')}
              className={`shrink-0 whitespace-nowrap text-white hover:text-gray-300 transition-colors pb-1 ${activeAlbum === 'all' ? 'border-b-2 border-white' : ''}`}
            >
              all
            </button>
          )}

          {/* "favorites" - not draggable */}
          {favoritesAlbum && (() => {
            const isActive = activeAlbum === 'favorites';
            const cls = `shrink-0 whitespace-nowrap text-white hover:text-gray-300 transition-colors pb-1 ${isActive ? 'border-b-2 border-white' : ''}`;
            return categorySlug ? (
              <Link
                href={`/${categorySlug}/favorites`}
                onClick={() => onAlbumChange('favorites')}
                className={cls}
              >
                favorites
              </Link>
            ) : (
              <button onClick={() => onAlbumChange('favorites')} className={cls}>
                favorites
              </button>
            );
          })()}

          {/* Albums - draggable when authenticated */}
          <Reorder.Group
            axis="x"
            values={draggableAlbums}
            onReorder={handleReorder}
            as="div"
            className="flex gap-4"
          >
            {draggableAlbums.map((album) => {
              const displayName = formatName(album.name) || formatName(album.id) || album.id || '';
              const isActive = activeAlbum === album.id;
              const commonClass = `shrink-0 whitespace-nowrap text-white hover:text-gray-300 transition-colors pb-1 ${isActive ? 'border-b-2 border-white' : ''}`;
              return (
                <Reorder.Item
                  key={album.id}
                  value={album}
                  as="div"
                  dragListener={canReorder}
                  style={canReorder ? { touchAction: 'none', userSelect: 'none' } : undefined}
                  whileDrag={{ scale: 1.1, opacity: 0.8 }}
                  onDragStart={() => { isDragging.current = true; }}
                  onDragEnd={() => { requestAnimationFrame(() => { isDragging.current = false; }); }}
                  className={canReorder ? 'cursor-grab active:cursor-grabbing' : ''}
                >
                  {canReorder ? (
                    <span
                      onClick={() => {
                        if (!isDragging.current) {
                          onAlbumChange(album.id);
                          if (categorySlug) router.push(`/${categorySlug}/${album.id}`);
                        }
                      }}
                      className={commonClass + ' cursor-pointer'}
                    >
                      {displayName}
                    </span>
                  ) : categorySlug ? (
                    <Link
                      href={`/${categorySlug}/${album.id}`}
                      onClick={() => onAlbumChange(album.id)}
                      className={commonClass}
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <button
                      onClick={() => onAlbumChange(album.id)}
                      className={commonClass}
                    >
                      {displayName}
                    </button>
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </motion.div>
      </div>
    </div>
  );
}
