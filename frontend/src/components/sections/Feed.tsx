'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import ImageTile from '@/components/ui/ImageTile';
import { imageSets } from '@/data/imageData';
import ImageModal from '@/components/ui/ImageModal';
import FeedSkeleton from '@/components/ui/FeedSkeleton';
import { getPosts, Post, deletePost } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

// 9-column grid system: small items (2x3, 3x2, 2x2) and large items (4x3, 3x4, 3x4)
const TILE_SHAPES = {
  // Small Content - Various aspect ratios
  'minor-square': { colSpan: 2, rowSpan: 2, size: 'minor', aspect: 'square', category: 'art' }, // 2x2 units (1:1)
  'minor-portrait': { colSpan: 2, rowSpan: 3, size: 'minor', aspect: 'portrait', category: 'art' }, // 2x3 units (2:3)
  'minor-landscape': { colSpan: 3, rowSpan: 2, size: 'minor', aspect: 'landscape', category: 'art' }, // 3x2 units (3:2)

  // Large Content - New aspect ratios
  'major-portrait': { colSpan: 3, rowSpan: 4, size: 'major', aspect: 'portrait', category: 'art' }, // 3x4 units (3:4)
  'major-landscape': { colSpan: 4, rowSpan: 3, size: 'major', aspect: 'landscape', category: 'art' }, // 4x3 units (4:3)
  'major-square': { colSpan: 3, rowSpan: 4, size: 'major', aspect: 'portrait', category: 'art' }, // 3x4 units (3:4)

  // Apparel - Using minor portrait
  'apparel': { colSpan: 2, rowSpan: 3, size: 'apparel', aspect: 'portrait', category: 'apparel' }, // 2x3 units (2:3)
  
  // Single column - for filling remaining space
  'single-column': { colSpan: 1, rowSpan: 2, size: 'minor', aspect: 'portrait', category: 'art' }, // 1x2 units (1:2)
} as const;

type TileShape = keyof typeof TILE_SHAPES;

interface FeedItem {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
  tileShape: TileShape;
  album?: string;
  date?: string; // ISO date string from database
  postId?: string; // UUID from database for deletion
  tags?: string[]; // Tags array
  contentUrl?: string;
  isAudio?: boolean;
  slug?: string;
  isText?: boolean;
  price?: number | null;
  galleryUrls?: string[];
  thumbnailUrl?: string | null;
  splashUrl?: string | null;
  rawPost?: Post;
}

interface FeedProps {
  directory: string;
  activeAlbum?: string;
  category?: string; // Optional category to fetch from database
  useDatabase?: boolean; // Flag to use database instead of static images
  activeTag?: string; // Active tag filter
  limit?: number; // Optional limit when fetching from database
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  colSpan: number;
  rowSpan: number;
  item: FeedItem;
}



// Function to get image dimensions
const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // Fallback dimensions if image fails to load
      resolve({ width: 1, height: 1 });
    };
    img.src = src;
  });
};

// Function to find the closest tile shape based on aspect ratio
const findClosestTileShape = (aspectRatio: number): TileShape => {
  const tileAspectRatios = {
    'minor-square': 1,        // 2x2 = 1:1
    'minor-portrait': 0.5,    // 2x3 = 2:3
    'minor-landscape': 2,     // 3x2 = 3:2
    'single-column': 0.25,    // 1x2 = 1:2
    'major-portrait': 0.75,   // 3x4 = 3:4
    'major-landscape': 1.5,   // 4x3 = 4:3
    'major-square': 0.75,     // 3x4 = 3:4 (same as major-portrait)
    'apparel': 0.5,           // 2x3 = 2:3 (same as minor-portrait)
  };

  let closestShape: TileShape = 'minor-square';
  let smallestDifference = Math.abs(aspectRatio - tileAspectRatios['minor-square']);

  for (const [shape, ratio] of Object.entries(tileAspectRatios)) {
    const difference = Math.abs(aspectRatio - ratio);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestShape = shape as TileShape;
    }
  }

  return closestShape;
};

// Function to convert Post objects to FeedItem objects (with image dimensions)
const convertPostsToFeedItems = async (posts: Post[]): Promise<FeedItem[]> => {
  const feedItems: FeedItem[] = [];
  
  for (let index = 0; index < posts.length; index++) {
    const post = posts[index];
    
    // Use thumbnail_url for the feed display
    const looksLikeText = post.category === 'bio' || (post.content_url && post.content_url.length > 0 && !/^https?:\/\//i.test(post.content_url));
    const fallbackImage = looksLikeText ? (post.thumbnail_url || '') : (post.thumbnail_url || post.content_url);
    const primaryGalleryImage = Array.isArray(post.gallery_urls) && post.gallery_urls.length > 0 ? post.gallery_urls[0] : undefined;
    const imageUrl = primaryGalleryImage || fallbackImage;
    const contentUrl = post.content_url;
    const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(contentUrl);
    
    // Get image dimensions to calculate aspect ratio
    const dimensions = await getImageDimensions(imageUrl);
    const aspectRatio = dimensions.width / dimensions.height;
    
    // Find the closest tile shape based on aspect ratio
    const tileShape = findClosestTileShape(aspectRatio);
    
    feedItems.push({
      id: parseInt(post.id.replace(/-/g, '').substring(0, 8), 16) || index + 1, // Convert UUID to number for ID
      title: post.title,
      description: post.description,
      image: imageUrl,
      category: post.category,
      tileShape: tileShape,
      album: post.album,
      date: post.date, // Include the date from the post
      postId: post.id, // Store the actual UUID for deletion
      tags: post.tags || [], // Include tags from the post
      contentUrl,
      isAudio,
      slug: post.slug,
      isText: Boolean(looksLikeText && !imageUrl),
      price: post.price ?? null,
      galleryUrls: post.gallery_urls || [],
      thumbnailUrl: post.thumbnail_url ?? null,
      splashUrl: post.splash_image_url ?? null,
      rawPost: post,
    });
  }
  
  return feedItems;
};

// Function to fetch posts from database (supports optional category and limit)
const fetchPostsFromDatabase = async (options: { category?: string; limit?: number }): Promise<Post[]> => {
  try {
    const { category, limit } = options;
    console.log('[Feed] Fetching posts from database', { category, limit });

    const params: { category?: string; limit?: number } = {};
    if (category) params.category = category;
    if (limit) params.limit = limit;

    const posts = await getPosts(params);
    console.log(`[Feed] Received ${posts.length} posts from database`);
    return posts;
  } catch (error) {
    console.error('[Feed] Error fetching posts from database:', error);
    return [];
  }
};

// Function to generate feed items based on directory (static images)
const generateFeedItems = async (directory: string, activeAlbum: string = 'all'): Promise<FeedItem[]> => {
  const images = imageSets[directory] || imageSets['pinterest_placeholders'];
  
  // Filter by album if not 'all'
  const filteredImages = activeAlbum === 'all' 
    ? images 
    : images.filter(img => img.album === activeAlbum);
  
  const feedItems: FeedItem[] = [];
  
  for (let index = 0; index < filteredImages.length; index++) {
    const imageData = filteredImages[index];
    const fileName = imageData.path.split('/').pop()?.split('.')[0] || `item-${index}`;
    
    // Get image dimensions to calculate aspect ratio
    const dimensions = await getImageDimensions(imageData.path);
    const aspectRatio = dimensions.width / dimensions.height;
    
    // Find the closest tile shape based on aspect ratio
    const tileShape = findClosestTileShape(aspectRatio);
    
    feedItems.push({
      id: index + 1,
      title: fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Creative work from ${directory.replace('_placeholders', '')}`,
      image: imageData.path,
      category: directory.replace('_placeholders', '').charAt(0).toUpperCase() + directory.replace('_placeholders', '').slice(1),
      tileShape: tileShape,
      album: imageData.album,
      contentUrl: undefined,
      isAudio: false,
      slug: undefined, // No slug for static images
      price: undefined,
      galleryUrls: undefined,
    });
  }
  
  return feedItems;
};

        // Simple 2D Packing Algorithm with gap filling
        const use2DPacking = (items: FeedItem[], containerWidth: number, gap: number = 16) => {
          const [positions, setPositions] = useState<Position[]>([]);
          const [containerHeight, setContainerHeight] = useState(0);
          const itemsLength = items.length;
          const itemsKey = items.map(item => item.id).join(','); // Stable key based on item IDs
          const prevItemsKeyRef = useRef<string>('');

          useEffect(() => {
            // Skip if items haven't actually changed (same IDs)
            if (itemsKey === prevItemsKeyRef.current && itemsLength > 0) {
              console.log('🎯 Skipping - items unchanged');
              return;
            }
            prevItemsKeyRef.current = itemsKey;
            
            console.log('🎯 use2DPacking effect running:', { itemsLength, containerWidth });
            if (itemsLength === 0 || containerWidth === 0) {
              console.log('⏭️ Clearing positions - items:', itemsLength, 'width:', containerWidth);
              // Only update if positions are not already empty
              setPositions(prev => prev.length === 0 ? prev : []);
              setContainerHeight(prev => prev === 0 ? prev : 0);
              return;
            }

                const calculatePositions = () => {
                  const gridUnits = 9; // 9-column grid system
                  const unitWidth = (containerWidth - gap * (gridUnits - 1)) / gridUnits;
                  const unitHeight = unitWidth; // Square units as base

                  // Create occupancy grid (9 columns, many rows)
                  const maxRows = 200;
                  const occupied = Array(maxRows).fill(null).map(() => Array(gridUnits).fill(false));
      
      const newPositions: Position[] = [];
      
      // Place each item in order (preserves date sorting)
      items.forEach((item) => {
        const shape = TILE_SHAPES[item.tileShape as TileShape];
        const { colSpan, rowSpan } = shape;
        
        // Find first available position (top-left scan)
        let placed = false;
        for (let row = 0; row < maxRows - rowSpan + 1; row++) {
          for (let col = 0; col < gridUnits - colSpan + 1; col++) {
            // Check if this position is available
            let canPlace = true;
            for (let r = row; r < row + rowSpan; r++) {
              for (let c = col; c < col + colSpan; c++) {
                if (occupied[r][c]) {
                  canPlace = false;
                  break;
                }
              }
              if (!canPlace) break;
            }
            
            if (canPlace) {
              // Place the item
              const x = col * (unitWidth + gap);
              const y = row * (unitHeight + gap);
              const width = colSpan * unitWidth + (colSpan - 1) * gap;
              const height = rowSpan * unitHeight + (rowSpan - 1) * gap;
              
              newPositions.push({ x, y, width, height, colSpan, rowSpan, item });
              
              // Mark cells as occupied
              for (let r = row; r < row + rowSpan; r++) {
                for (let c = col; c < col + colSpan; c++) {
                  occupied[r][c] = true;
                }
              }
              
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      });
      
      // No gap filling - just use the regular items
      const allPositions = newPositions;
      
      // Calculate container height
      let maxY = 0;
      allPositions.forEach(pos => {
        maxY = Math.max(maxY, pos.y + pos.height);
      });
      
      // Only update if positions actually changed
      setPositions(prev => {
        if (prev.length !== allPositions.length) return allPositions;
        // Check if any position changed
        const changed = prev.some((oldPos, i) => {
          const newPos = allPositions[i];
          return !newPos || oldPos.x !== newPos.x || oldPos.y !== newPos.y || oldPos.item.id !== newPos.item.id;
        });
        return changed ? allPositions : prev;
      });
      
      setContainerHeight(prev => prev === maxY ? prev : maxY);
    };

    calculatePositions();
  }, [itemsLength, itemsKey, containerWidth, gap]);

  return { positions, containerHeight };
};

export default function Feed({ directory, activeAlbum = 'all', category, useDatabase = false, activeTag = '', limit }: FeedProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedImage, setSelectedImage] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allFeedItems, setAllFeedItems] = useState<FeedItem[]>([]); // Store all items (unfiltered)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]); // Filtered items to display
  const [isLoading, setIsLoading] = useState(true);
  const fetchLimit = limit ?? 1000;
  const previousUrlRef = useRef<string | null>(null);
  const { token: authToken, user } = useAuth();
  
  // Callback ref to measure width when element is mounted
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      console.log('🔍 Container mounted, measuring width:', node.offsetWidth);
      setContainerWidth(node.offsetWidth);
    }
  }, []);
  
  // Fetch all posts from database (only when category/directory changes)
  useEffect(() => {
    const loadAllFeedItems = async () => {
      console.log('🚀 Starting to load all feed items...', { useDatabase, category, directory });
      
      setIsLoading(true);
      
      try {
        let items: FeedItem[];
        
        if (useDatabase) {
          // Fetch posts from database (optionally filtered by category)
          const posts = await fetchPostsFromDatabase({ category, limit: fetchLimit });
          // Convert posts to feed items
          items = await convertPostsToFeedItems(posts);
          console.log('✅ Feed items loaded from database:', items.length, 'items');
        } else {
          // Use static images - fetch all (no album filtering)
          items = await generateFeedItems(directory, 'all');
          console.log('✅ All feed items loaded from static images:', items.length, 'items');
        }
        
        setAllFeedItems(items);
      } catch (error) {
        console.error('❌ Error loading feed items:', error);
        setAllFeedItems([]);
      } finally {
        console.log('🏁 Finished loading all feed items, setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    loadAllFeedItems();
  }, [directory, category ?? '', useDatabase ?? false, fetchLimit]); // Refetch when inputs change
  
  // Filter feed items locally based on activeAlbum
  useEffect(() => {
    if (allFeedItems.length === 0) {
      setFeedItems([]);
      return;
    }
    
    // Debug: Log all album values
    const uniqueAlbums = [...new Set(allFeedItems.map(item => item.album))];
    console.log(`[Feed] All unique albums in feed items:`, uniqueAlbums);
    console.log(`[Feed] Filtering - activeAlbum: "${activeAlbum}" (type: ${typeof activeAlbum}), activeTag: "${activeTag}"`);
    
    // Filter locally from allFeedItems by album and tag
    let filtered = allFeedItems;
    
    // Filter by album
    if (activeAlbum !== 'all') {
      filtered = filtered.filter(item => {
        const matches = item.album === activeAlbum;
        if (!matches) {
          console.log(`[Feed] Item "${item.title}" album "${item.album}" does not match "${activeAlbum}"`);
        }
        return matches;
      });
    }
    
    // Filter by tag
    if (activeTag && activeTag !== '') {
      filtered = filtered.filter(item => {
        const hasTag = item.tags && item.tags.includes(activeTag);
        if (!hasTag) {
          console.log(`[Feed] Item "${item.title}" does not have tag "${activeTag}"`);
        }
        return hasTag;
      });
    }
    
    console.log(`[Feed] Filtering result - activeAlbum: ${activeAlbum}, activeTag: ${activeTag}, showing ${filtered.length} of ${allFeedItems.length} items`);
    console.log(`[Feed] Filtered items:`, filtered.map(item => ({ title: item.title, album: item.album, tags: item.tags })));
    setFeedItems(filtered);
  }, [activeAlbum, activeTag, allFeedItems]);
  
  const { positions, containerHeight } = use2DPacking(
    containerWidth > 0 ? feedItems : [],
    containerWidth
  );

  console.log('📊 Current state:', {
    isLoading,
    containerWidth,
    feedItemsCount: feedItems.length,
    positionsCount: positions.length,
    willShowSkeleton: isLoading,
    willShowContent: !isLoading && containerWidth > 0 && feedItems.length > 0
  });

  const handleImageClick = (item: FeedItem) => {
    const detailHref = item.slug && item.category && item.album
      ? `/${encodeURIComponent(item.category)}/${encodeURIComponent(item.album)}/${encodeURIComponent(item.slug)}`
      : null;

    if (detailHref && typeof window !== 'undefined') {
      if (!previousUrlRef.current) {
        previousUrlRef.current = window.location.pathname + window.location.search;
      }
      window.history.pushState({ modal: true }, '', detailHref);
    }

    setSelectedImage(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);

    if (typeof window !== 'undefined' && previousUrlRef.current) {
      window.history.replaceState(null, '', previousUrlRef.current);
      previousUrlRef.current = null;
    }
  };
  
  const handleDeletePost = useCallback(async (postId: string) => {
    if (!authToken) {
      console.warn('[Feed] Attempted to delete post without auth token.');
      return;
    }
    try {
      await deletePost(postId, authToken);
      console.log('[Feed] Post deleted successfully');
      
      // Remove from allFeedItems
      setAllFeedItems(prev => prev.filter(item => item.postId !== postId));
      
      // Close modal
      setIsModalOpen(false);
      setSelectedImage(null);
    } catch (err) {
      console.error('[Feed] Error deleting post:', err);
      throw err; // Re-throw so ImageModal can handle it
    }
  }, [authToken]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.modal && isModalOpen) {
        setIsModalOpen(false);
        setSelectedImage(null);
        previousUrlRef.current = null;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isModalOpen]);

  if (isLoading) {
    return <FeedSkeleton count={20} />;
  }

  return (
    <div className="bg-black">
      <div className="w-full px-4 py-8">

        {/* Smart 2D Packing Grid Layout */}
        <div 
          ref={containerRefCallback}
          className="relative w-full"
          style={{ height: containerHeight }}
        >
                  {positions.map((position, index) => {
                    const item = position.item;
                    if (!item) return null;

                    return (
                      <motion.div
                        key={item.id}
                        className="absolute cursor-pointer"
                        style={{
                          left: position.x,
                          top: position.y,
                          width: position.width,
                          height: position.height,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.02, ease: "easeOut" }}
                        onClick={() => handleImageClick(item)}
                        whileHover={{ scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
                        whileTap={{ scale: 0.98, transition: { duration: 0.15, ease: "easeOut" } }}
                      >
                        <ImageTile item={item} index={index} />
                      </motion.div>
                    );
                  })}
        </div>
      </div>
      
      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          image={selectedImage.image}
          title={selectedImage.title}
          description={selectedImage.description}
          date={selectedImage.date}
          tags={selectedImage.tags}
          postId={selectedImage.postId}
          contentUrl={selectedImage.contentUrl}
          isAudio={selectedImage.isAudio}
          slug={selectedImage.slug}
          category={selectedImage.category}
          album={selectedImage.album}
          isText={selectedImage.isText}
          price={selectedImage.price}
          galleryUrls={selectedImage.galleryUrls}
          onDelete={useDatabase && authToken ? handleDeletePost : undefined}
          canEdit={Boolean(authToken && user)}
          post={
            selectedImage.rawPost
              ? {
                  content_url: selectedImage.rawPost.content_url,
                  thumbnail_url: selectedImage.rawPost.thumbnail_url,
                  splash_image_url: selectedImage.rawPost.splash_image_url,
                  gallery_urls: selectedImage.rawPost.gallery_urls ?? [],
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
