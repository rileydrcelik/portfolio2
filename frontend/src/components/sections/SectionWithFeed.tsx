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
  albums?: Album[];
  category?: string;
  useDatabase?: boolean;
  initialAlbum?: string;
  categorySlug?: string;
}

export default function SectionWithFeed({ title, directory, albums: initialAlbums = [], category, useDatabase = false, initialAlbum = 'all', categorySlug }: SectionWithFeedProps) {
  const [activeAlbum, setActiveAlbum] = useState(initialAlbum);
  const [activeTag, setActiveTag] = useState('');
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    setActiveAlbum(initialAlbum);
  }, [initialAlbum]);

  // Fetch albums, post counts, and tags from database when using database
  useEffect(() => {
    if (useDatabase && category) {
      const fetchData = async () => {
        try {
          // Fetch all posts for this category
          const allPosts = await getPosts({ category, limit: 1000 });
          
          // Calculate counts per album
          const albumCounts = new Map<string, number>();
          allPosts.forEach(post => {
            const currentCount = albumCounts.get(post.album) || 0;
            albumCounts.set(post.album, currentCount + 1);
          });
          
          // Create dynamic albums from unique album values in posts
          const dynamicAlbums: Album[] = Array.from(albumCounts.entries()).map(([albumSlug, count]) => ({
            id: albumSlug,
            name: albumSlug,
            count: count,
          })).sort((a, b) => a.name.localeCompare(b.name));
          
          setAlbums(dynamicAlbums);
          
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
          console.error('[SectionWithFeed] Error fetching data:', error);
          // On error, show empty state
          setAlbums([]);
          setTotalCount(0);
          setAvailableTags([]);
        }
      };
      
      fetchData();
    } else if (initialAlbums.length > 0) {
      // Use static albums when not using database
      const total = initialAlbums.reduce((sum, album) => sum + album.count, 0);
      setAlbums(initialAlbums);
      setTotalCount(total);
      setAvailableTags([]);
    }
  }, [useDatabase, category]);

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
        categorySlug={categorySlug ?? category}
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
