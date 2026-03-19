'use client';

import { useState, useEffect, useCallback } from 'react';
import SectionHeader from './SectionHeader';
import Feed from './Feed';
import { getPosts } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

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
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const { token: authToken } = useAuth();

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

          // Calculate counts and latest date per album
          const albumCounts = new Map<string, number>();
          const albumLatestDates = new Map<string, number>();

          allPosts.forEach(post => {
            const postDate = new Date(post.updated_at || post.created_at || post.date).getTime();

            // Count in primary album
            albumCounts.set(post.album, (albumCounts.get(post.album) || 0) + 1);
            const primaryLatest = albumLatestDates.get(post.album) || 0;
            if (postDate > primaryLatest) albumLatestDates.set(post.album, postDate);

            // Count cross-posted albums (same subject, plain album slugs)
            if (post.cross_post_albums) {
              post.cross_post_albums.forEach(cpAlbum => {
                albumCounts.set(cpAlbum, (albumCounts.get(cpAlbum) || 0) + 1);
                const cpLatest = albumLatestDates.get(cpAlbum) || 0;
                if (postDate > cpLatest) albumLatestDates.set(cpAlbum, postDate);
              });
            }
          });

          // Create dynamic albums from unique album values in posts
          const dynamicAlbums: Album[] = Array.from(albumCounts.entries()).map(([albumSlug, count]) => ({
            id: albumSlug,
            name: albumSlug,
            count: count,
          })).sort((a, b) => {
            const dateA = albumLatestDates.get(a.id) || 0;
            const dateB = albumLatestDates.get(b.id) || 0;
            return dateB - dateA; // Descending order (newest first)
          });

          // Check for favorites
          const favoritesCount = allPosts.filter(post => post.is_favorite).length;
          if (favoritesCount > 0) {
            // Find latest favorite date
            const latestFavDate = allPosts
              .filter(p => p.is_favorite)
              .reduce((max, p) => {
                const d = new Date(p.updated_at || p.created_at || p.date).getTime();
                return d > max ? d : max;
              }, 0);

            // We want favorites to be first usually, or sorted by its own date? 
            // Usually "Favorites" is a special category at the top. 
            // The existing code unshifted it to the front. 
            // Let's keep it at the front as per existing logic, or arguably it should also be sorted?
            // "Favorites" is a meta-album. The previous code unshifted it *after* sort. 
            // So it was always first. I will keep it always first for consistency.

            dynamicAlbums.unshift({
              id: 'favorites',
              name: 'favorites',
              count: favoritesCount,
            });
          }

          // Apply saved order from localStorage if available
          try {
            const savedOrder = JSON.parse(localStorage.getItem(`albumOrder:${category}`) || 'null');
            if (savedOrder && Array.isArray(savedOrder)) {
              dynamicAlbums.sort((a, b) => {
                const indexA = savedOrder.indexOf(a.id);
                const indexB = savedOrder.indexOf(b.id);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
              });
            }
          } catch { /* ignore invalid saved order */ }

          setAlbums(dynamicAlbums);

          // Total count = unique posts in this category (not sum of album counts)
          setTotalCount(allPosts.length);

          // Extract all unique tags with counts
          const tagCounts = new Map<string, number>();
          allPosts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
              post.tags.forEach(tag => {
                const count = tagCounts.get(tag) || 0;
                tagCounts.set(tag, count + 1);
              });
            }
          });

          const sortedTags = Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setAvailableTags(sortedTags);
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

  const handleAlbumsReorder = useCallback((newAlbums: Album[]) => {
    setAlbums(newAlbums);
    if (category) {
      localStorage.setItem(`albumOrder:${category}`, JSON.stringify(newAlbums.map(a => a.id)));
    }
  }, [category]);

  return (
    <div className="min-h-screen bg-black">
      {/* Section Header with Album Filtering */}
      <SectionHeader
        title={title}
        totalCount={totalCount}
        albums={albums}
        activeAlbum={activeAlbum}
        onAlbumChange={setActiveAlbum}
        onAlbumsReorder={handleAlbumsReorder}
        canReorder={!!authToken}
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
