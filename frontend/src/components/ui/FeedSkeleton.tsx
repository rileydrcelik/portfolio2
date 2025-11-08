'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

interface FeedSkeletonProps {
  count?: number;
}

interface SkeletonItem {
  id: number;
  colSpan: number;
  rowSpan: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  item: SkeletonItem;
}

// Same tile shapes as the actual feed
const TILE_SHAPES = {
  'minor-square': { colSpan: 2, rowSpan: 2 },
  'minor-portrait': { colSpan: 2, rowSpan: 3 },
  'minor-landscape': { colSpan: 3, rowSpan: 2 },
  'major-portrait': { colSpan: 3, rowSpan: 4 },
  'major-landscape': { colSpan: 4, rowSpan: 3 },
  'major-square': { colSpan: 3, rowSpan: 4 },
  'apparel': { colSpan: 2, rowSpan: 3 },
  'single-column': { colSpan: 1, rowSpan: 2 },
};

const TILE_SHAPE_KEYS = Object.keys(TILE_SHAPES) as Array<keyof typeof TILE_SHAPES>;

// 2D Packing Algorithm (same as Feed component)
const use2DPacking = (items: SkeletonItem[], containerWidth: number, gap: number = 16) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const calculatePositions = () => {
        const gridUnits = 9;
      const unitSize = (containerWidth - (gridUnits - 1) * gap) / gridUnits;
      
      const allPositions: Position[] = [];
      const occupiedCells: boolean[][] = [];
      
      // Initialize occupied cells grid
      for (let i = 0; i < 100; i++) {
        occupiedCells[i] = new Array(100).fill(false);
      }

      items.forEach((item) => {
        const shape = TILE_SHAPES[TILE_SHAPE_KEYS[item.id % TILE_SHAPE_KEYS.length]];
        const colSpan = shape.colSpan;
        const rowSpan = shape.rowSpan;
        
        const width = colSpan * unitSize + (colSpan - 1) * gap;
        const height = rowSpan * unitSize + (rowSpan - 1) * gap;
        
        // Find the first available position
        let placed = false;
        for (let row = 0; row < 100 - rowSpan + 1 && !placed; row++) {
          for (let col = 0; col < gridUnits - colSpan + 1 && !placed; col++) {
            // Check if this position is available
            let canPlace = true;
            for (let r = row; r < row + rowSpan && canPlace; r++) {
              for (let c = col; c < col + colSpan && canPlace; c++) {
                if (occupiedCells[r] && occupiedCells[r][c]) {
                  canPlace = false;
                }
              }
            }
            
            if (canPlace) {
              // Place the item
              const x = col * (unitSize + gap);
              const y = row * (unitSize + gap);
              
              allPositions.push({
                x,
                y,
                width,
                height,
                item,
              });
              
              // Mark cells as occupied
              for (let r = row; r < row + rowSpan; r++) {
                for (let c = col; c < col + colSpan; c++) {
                  if (!occupiedCells[r]) occupiedCells[r] = [];
                  occupiedCells[r][c] = true;
                }
              }
              
              placed = true;
            }
          }
        }
      });

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

export default function FeedSkeleton({ count = 20 }: FeedSkeletonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  
  // Generate skeleton items with varying tile shapes (memoized to prevent infinite re-renders)
  const skeletonItems: SkeletonItem[] = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      colSpan: TILE_SHAPES[TILE_SHAPE_KEYS[i % TILE_SHAPE_KEYS.length]].colSpan,
      rowSpan: TILE_SHAPES[TILE_SHAPE_KEYS[i % TILE_SHAPE_KEYS.length]].rowSpan,
    })), [count]
  );
  
  const { positions, containerHeight } = use2DPacking(skeletonItems, containerWidth);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Account for the px-4 padding (16px on each side = 32px total)
        const availableWidth = containerRef.current.offsetWidth - 32;
        setContainerWidth(availableWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-8">
        <div 
          ref={containerRef}
          className="relative"
          style={{ height: containerHeight }}
        >
          {positions.map((position, index) => (
            <div
              key={position.item.id}
              className="absolute bg-gray-800 rounded-2xl overflow-hidden animate-pulse"
              style={{
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
              }}
            >
              <div className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
