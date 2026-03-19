'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import ImageTile from '@/components/ui/ImageTile';
import { imageSets } from '@/data/imageData';
import ImageModal from '@/components/ui/ImageModal';
import FeedSkeleton from '@/components/ui/FeedSkeleton';
import { getPosts, Post, deletePost } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

// Hook for infinite scroll using IntersectionObserver
function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin: '600px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return sentinelRef;
}

// 9-column grid system: small items (2x3, 3x2, 2x2), large items (4x3, 3x4), and featured items (6 columns)
const TILE_SHAPES = {
  // Small Content - Various aspect ratios
  'minor-square': { colSpan: 2, rowSpan: 2, size: 'minor', aspect: 'square', category: 'art' }, // 2x2 units (1:1)
  'minor-portrait': { colSpan: 2, rowSpan: 3, size: 'minor', aspect: 'portrait', category: 'art' }, // 2x3 units (2:3)
  'minor-landscape': { colSpan: 3, rowSpan: 2, size: 'minor', aspect: 'landscape', category: 'art' }, // 3x2 units (3:2)

  // Large Content - Various aspect ratios
  'major-portrait': { colSpan: 3, rowSpan: 4, size: 'major', aspect: 'portrait', category: 'art' }, // 3x4 units (3:4)
  'major-landscape': { colSpan: 4, rowSpan: 3, size: 'major', aspect: 'landscape', category: 'art' }, // 4x3 units (4:3)
  'major-square': { colSpan: 3, rowSpan: 4, size: 'major', aspect: 'portrait', category: 'art' }, // 3x4 units (3:4)

  // Featured Content - 6 columns wide for is_major posts
  'featured-portrait': { colSpan: 6, rowSpan: 8, size: 'featured', aspect: 'portrait', category: 'art' }, // 6x8 units (3:4)
  'featured-landscape': { colSpan: 6, rowSpan: 4, size: 'featured', aspect: 'landscape', category: 'art' }, // 6x4 units (3:2)
  'featured-square': { colSpan: 6, rowSpan: 6, size: 'featured', aspect: 'square', category: 'art' }, // 6x6 units (1:1)

  // Shop - Using minor portrait
  'shop': { colSpan: 2, rowSpan: 3, size: 'apparel', aspect: 'portrait', category: 'apparel' }, // 2x3 units (2:3)

  // Single column - for filling remaining space
  'single-column': { colSpan: 1, rowSpan: 2, size: 'minor', aspect: 'portrait', category: 'art' }, // 1x2 units (1:2)
} as const;

// Mobile Grid System (2 columns)
const MOBILE_TILE_SHAPES = {
  // Square items (1x1) - for square, landscape, and major items
  'square': { colSpan: 1, rowSpan: 1 },
  // Tall items (1x2) - for portrait items
  'tall': { colSpan: 1, rowSpan: 2 },
} as const;

type TileShape = keyof typeof TILE_SHAPES;

interface FeedItem {
  id: string;
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
  isActive?: boolean;
  isFavorite?: boolean;
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
    'shop': 0.5,              // 2x3 = 2:3 (same as minor-portrait)
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
  // Load all image dimensions in parallel for performance
  const postData = posts.map(post => {
    const looksLikeText = post.category === 'bio' || (post.content_url && post.content_url.length > 0 && !/^https?:\/\//i.test(post.content_url));
    const fallbackImage = looksLikeText ? (post.thumbnail_url || '') : (post.thumbnail_url || post.content_url);
    const primaryGalleryImage = Array.isArray(post.gallery_urls) && post.gallery_urls.length > 0 ? post.gallery_urls[0] : undefined;
    const imageUrl = primaryGalleryImage || fallbackImage;
    return { post, imageUrl, looksLikeText };
  });

  const dimensions = await Promise.all(postData.map(d => getImageDimensions(d.imageUrl)));

  return postData.map(({ post, imageUrl, looksLikeText }, index) => {
    const contentUrl = post.content_url;
    const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(contentUrl);
    const aspectRatio = dimensions[index].width / dimensions[index].height;

    // Determine tile shape
    let tileShape: TileShape;
    if (post.category === 'apparel') {
      tileShape = 'shop';
    } else if (post.is_major) {
      if (aspectRatio > 1.2) {
        tileShape = 'featured-landscape';
      } else if (aspectRatio < 0.8) {
        tileShape = 'featured-portrait';
      } else {
        tileShape = 'featured-square';
      }
    } else {
      tileShape = findClosestTileShape(aspectRatio);
    }

    return {
      id: post.id,
      title: post.title,
      description: post.description || '',
      image: imageUrl,
      category: post.category === 'apparel' ? 'shop' : post.category,
      tileShape: tileShape,
      album: post.album,
      date: post.date,
      postId: post.id,
      tags: post.tags || [],
      contentUrl,
      isAudio,
      slug: post.slug,
      isText: Boolean(looksLikeText && !imageUrl),
      price: post.price ?? null,
      galleryUrls: post.gallery_urls || [],
      thumbnailUrl: post.thumbnail_url ?? null,
      splashUrl: post.splash_image_url ?? null,
      rawPost: post,
      isActive: post.is_active,
      isFavorite: post.is_favorite,
    };
  });
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
      id: `static-${index}`,
      title: fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Creative work from ${directory.replace('_placeholders', '')}`,
      image: imageData.path,
      category: directory.includes('apparel') ? 'Shop' : (directory.replace('_placeholders', '').charAt(0).toUpperCase() + directory.replace('_placeholders', '').slice(1)),
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
      const isMobile = containerWidth < 768;
      const gridUnits = isMobile ? 2 : 9; // 2 columns for mobile, 9 for desktop
      const unitWidth = (containerWidth - gap * (gridUnits - 1)) / gridUnits;
      const unitHeight = unitWidth; // Square units as base

      // Create occupancy grid (columns x rows)
      const maxRows = 1000;
      const occupied = Array(maxRows).fill(null).map(() => Array(gridUnits).fill(false));

      const newPositions: Position[] = [];

      // Place each item in order (preserves date sorting)
      items.forEach((item) => {
        let colSpan, rowSpan;

        if (isMobile) {
          // Map original shapes to mobile shapes
          const originalShape = TILE_SHAPES[item.tileShape as TileShape];
          // If it's portrait or apparel, make it tall (1x2), otherwise square (1x1)
          if (originalShape.aspect === 'portrait') {
            colSpan = MOBILE_TILE_SHAPES.tall.colSpan;
            rowSpan = MOBILE_TILE_SHAPES.tall.rowSpan;
          } else {
            colSpan = MOBILE_TILE_SHAPES.square.colSpan;
            rowSpan = MOBILE_TILE_SHAPES.square.rowSpan;
          }
        } else {
          const shape = TILE_SHAPES[item.tileShape as TileShape];
          colSpan = shape.colSpan;
          rowSpan = shape.rowSpan;
        }

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
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const fetchLimit = limit ?? 50; // Default to 50 for pagination
  const previousUrlRef = useRef<string | null>(null);
  const offsetRef = useRef(0); // Track API offset independently of feedItems.length
  const isFetchingRef = useRef(false); // Ref-based guard to prevent concurrent fetches
  const { token: authToken, user } = useAuth();

  // Callback ref to measure width when element is mounted
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      console.log('🔍 Container mounted, measuring width:', node.offsetWidth);
      setContainerWidth(node.offsetWidth);
    }
  }, []);

  // Fetch posts from database (paginated)
  useEffect(() => {
    const loadFeedItems = async () => {
      console.log('🚀 Loading feed items...', { useDatabase, category, directory, activeAlbum, activeTag });

      setIsLoading(true);
      setFeedItems([]); // Reset items on filter change
      offsetRef.current = 0;

      try {
        let items: FeedItem[];

        if (useDatabase) {
          // Fetch posts from database with filters
          const params: { category?: string; limit?: number; album?: string; tag?: string; offset?: number; is_favorite?: boolean } = {
            category,
            limit: fetchLimit,
            offset: 0
          };

          if (activeAlbum !== 'all') {
            if (activeAlbum === 'favorites') {
              params.is_favorite = true;
            } else {
              params.album = activeAlbum;
            }
          }
          if (activeTag) params.tag = activeTag;

          const posts = await getPosts(params);
          items = await convertPostsToFeedItems(posts);
          console.log('✅ Feed items loaded from database:', items.length, 'items');

          offsetRef.current = posts.length;
          setHasMore(posts.length === fetchLimit);
        } else {
          // Use static images - fetch all (no album filtering)
          items = await generateFeedItems(directory, activeAlbum);
          console.log('✅ All feed items loaded from static images:', items.length, 'items');
          setHasMore(false); // Static images are all loaded at once
        }

        setFeedItems(items);
      } catch (error) {
        console.error('❌ Error loading feed items:', error);
        setFeedItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedItems();
  }, [directory, category, useDatabase, activeAlbum, activeTag, fetchLimit]);

  const handleLoadMore = useCallback(async () => {
    if (!useDatabase || isLoading || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsFetchingMore(true);
    try {
      const params: { category?: string; limit?: number; album?: string; tag?: string; offset?: number; is_favorite?: boolean } = {
        category,
        limit: fetchLimit,
        offset: offsetRef.current
      };

      if (activeAlbum !== 'all') {
        if (activeAlbum === 'favorites') {
          params.is_favorite = true;
        } else {
          params.album = activeAlbum;
        }
      }
      if (activeTag) params.tag = activeTag;

      const posts = await getPosts(params);
      offsetRef.current += posts.length;
      const newItems = await convertPostsToFeedItems(posts);

      setFeedItems(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const unique = newItems.filter(item => !existingIds.has(item.id));
        return [...prev, ...unique];
      });
      setHasMore(posts.length === fetchLimit);
    } catch (error) {
      console.error('❌ Error loading more items:', error);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  }, [useDatabase, isLoading, category, fetchLimit, activeAlbum, activeTag]);

  const sentinelRef = useInfiniteScroll(
    handleLoadMore,
    hasMore && !isLoading && useDatabase
  );

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
    // Do not clear setSelectedImage here, wait for animation
  };

  const handleExitComplete = () => {
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
      window.location.reload();
    } catch (err) {
      console.error('[Feed] Error deleting post:', err);
      throw err; // Re-throw so ImageModal can handle it
    }
  }, [authToken]);

  const handleUpdatePost = useCallback(async (updatedPost: Post) => {
    // Convert updated Post to FeedItem format (simplified)
    const updatedFeedItems = await convertPostsToFeedItems([updatedPost]);
    if (updatedFeedItems.length === 0) return;

    const newItem = updatedFeedItems[0];

    // Update lists
    setFeedItems(prev => prev.map(item => item.postId === newItem.postId ? newItem : item));
    setAllFeedItems(prev => prev.map(item => item.postId === newItem.postId ? newItem : item));

    // Update currently selected image to reflect changes in modal immediately
    setSelectedImage(newItem);

    console.log('[Feed] Post updated:', newItem.title);
    window.location.reload();
  }, []);

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

  return (
    <div className="bg-black">
      <div className="w-full px-4 pt-8">

        {/* Measure width wrapper */}
        <div ref={containerRefCallback} className="w-full">
          {(isLoading || (feedItems.length > 0 && containerHeight === 0)) ? (
            <FeedSkeleton count={20} />
          ) : (
            <div
              className="relative w-full"
              style={{ height: containerHeight }}
            >
              {positions.map((position, index) => {
                const item = position.item;
                if (!item) return null;

                const detailHref = item.slug && item.category && item.album
                  ? `/${encodeURIComponent(item.category)}/${encodeURIComponent(item.album)}/${encodeURIComponent(item.slug)}`
                  : null;

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
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0, margin: "200px" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.15, ease: "easeOut" } }}
                  >
                    {detailHref ? (
                      <a
                        href={detailHref}
                        onClick={(e) => {
                          e.preventDefault();
                          handleImageClick(item);
                        }}
                        className="block w-full h-full"
                        draggable={false}
                      >
                        <ImageTile item={item} index={index} />
                      </a>
                    ) : (
                      <div onClick={() => handleImageClick(item)} className="w-full h-full">
                        <ImageTile item={item} index={index} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Infinite scroll sentinel - directly after grid, no gap */}
          {hasMore && !isLoading && <div ref={sentinelRef} className="h-px" />}
          {isFetchingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}
          {!hasMore && !isLoading && <div className="h-8" />}
        </div>
      </div>

      {/* Image Modal */}
      {
        selectedImage && (
          <ImageModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onExitComplete={handleExitComplete}
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
            isActive={selectedImage.isActive}
            isFavorite={selectedImage.isFavorite}
            crossPostAlbums={selectedImage.rawPost?.cross_post_albums}
            onDelete={useDatabase && authToken ? handleDeletePost : undefined}
            onUpdate={useDatabase && authToken ? handleUpdatePost : undefined}
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
        )
      }
    </div >
  );
}
