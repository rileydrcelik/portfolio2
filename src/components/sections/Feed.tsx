'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import ImageTile from '@/components/ui/ImageTile';
import { imageSets } from '@/data/imageData';
import ImageModal from '@/components/ui/ImageModal';
import FeedSkeleton from '@/components/ui/FeedSkeleton';

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
}

interface FeedProps {
  directory: string;
  activeAlbum?: string;
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

// Function to generate feed items based on directory
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
    });
  }
  
  return feedItems;
};

        // Simple 2D Packing Algorithm with gap filling
        const use2DPacking = (items: FeedItem[], containerWidth: number, gap: number = 16) => {
          const [positions, setPositions] = useState<Position[]>([]);
          const [containerHeight, setContainerHeight] = useState(0);

          useEffect(() => {
            console.log('🎯 use2DPacking effect running:', { itemsLength: items.length, containerWidth });
            if (items.length === 0 || containerWidth === 0) {
              console.log('⏭️ Skipping layout calculation - items:', items.length, 'width:', containerWidth);
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
      setPositions(allPositions);
      
      // Calculate container height
      let maxY = 0;
      allPositions.forEach(pos => {
        maxY = Math.max(maxY, pos.y + pos.height);
      });
      setContainerHeight(maxY);
    };

    calculatePositions();
  }, [items, containerWidth, gap]);

  return { positions, containerHeight };
};

export default function Feed({ directory, activeAlbum = 'all' }: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedImage, setSelectedImage] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Callback ref to measure width when element is mounted
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      console.log('🔍 Container mounted, measuring width:', node.offsetWidth);
      setContainerWidth(node.offsetWidth);
    }
  }, []);
  
  // Load feed items with aspect ratio calculation
  useEffect(() => {
    const loadFeedItems = async () => {
      console.log('🚀 Starting to load feed items...');
      setIsLoading(true);
      try {
        const items = await generateFeedItems(directory, activeAlbum);
        console.log('✅ Feed items loaded:', items.length, 'items');
        setFeedItems(items);
      } catch (error) {
        console.error('❌ Error loading feed items:', error);
        setFeedItems([]);
      } finally {
        console.log('🏁 Finished loading feed items, setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    loadFeedItems();
  }, [directory, activeAlbum]);
  
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
    setSelectedImage(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

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
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                        onClick={() => handleImageClick(item)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ImageTile item={item} index={index} />
                      </motion.div>
                    );
                  })}
        </div>

        {/* Load More Button */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <button className="px-8 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors">
            Load More
          </button>
        </motion.div>
      </div>
      
      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          image={selectedImage.image}
          title={selectedImage.title}
          description={selectedImage.description}
        />
      )}
    </div>
  );
}
