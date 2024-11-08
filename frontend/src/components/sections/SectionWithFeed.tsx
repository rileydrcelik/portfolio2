'use client';

import { useState, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import Feed from './Feed';
import { getPosts } from '@/lib/api';

interface Album {
  id: string;
  name: string;
  count: number;
}

interface SectionWithFeedProps {
  title: string;
  directory: string;
  albums: Album[];
  category?: string;
  useDatabase?: boolean;
}

export default function SectionWithFeed({ title, directory, albums: initialAlbums, category, useDatabase = false }: SectionWithFeedProps) {
  const [activeAlbum, setActiveAlbum] = useState('all');
  const [activeTag, setActiveTag] = useState('');
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Fetch post counts and tags from database when using database
  useEffect(() => {
    if (useDatabase && category) {
      const fetchCounts = async () => {
        try {
          // Fetch all posts for this category to get counts
          const allPosts = await getPosts({ category, limit: 1000 });
          
          // Calculate counts per album
          const albumCounts = new Map<string, number>();
          allPosts.forEach(post => {
            const currentCount = albumCounts.get(post.album) || 0;
            albumCounts.set(post.album, currentCount + 1);
          });
          
          // Update albums with actual counts
          const updatedAlbums = initialAlbums.map(album => ({
            ...album,
            count: albumCounts.get(album.id) || 0,
          }));
          
          setAlbums(updatedAlbums);
          
          // Calculate total count
          const total = Array.from(albumCounts.values()).reduce((sum, count) => sum + count, 0);
          setTotalCount(total);
          
          // Extract all unique tags
          const tagSet = new Set<string>();
          allPosts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
              post.tags.forEach(tag => tagSet.add(tag));
            }
          });
          setAvailableTags(Array.from(tagSet).sort());
        } catch (error) {
          console.error('[SectionWithFeed] Error fetching post counts:', error);
          // Fallback to static counts on error
          const total = initialAlbums.reduce((sum, album) => sum + album.count, 0);
          setTotalCount(total);
          setAvailableTags([]);
        }
      };
      
      fetchCounts();
    } else {
      // Use static counts when not using database
      const total = initialAlbums.reduce((sum, album) => sum + album.count, 0);
      setTotalCount(total);
      setAvailableTags([]);
    }
  }, [useDatabase, category, initialAlbums]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Section Header with Album Filtering */}
      <SectionHeader
        title={title}
        totalCount={totalCount}
        albums={albums}
        activeAlbum={activeAlbum}
        onAlbumChange={setActiveAlbum}
        tags={availableTags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
      />
      
      {/* Feed with Filtering */}
      <Feed
        directory={directory}
        activeAlbum={activeAlbum}
        category={category}
        useDatabase={useDatabase}
        activeTag={activeTag}
      />
    </div>
  );
}
