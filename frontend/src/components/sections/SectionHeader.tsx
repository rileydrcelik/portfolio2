'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  categorySlug,
}: SectionHeaderProps) {
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
        {/* Main Title */}
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
