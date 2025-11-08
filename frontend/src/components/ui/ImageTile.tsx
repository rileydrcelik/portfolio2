'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface ImageTileProps {
  item: {
    id: number;
    title: string;
    description: string;
    image: string;
    category: string;
  };
  index: number;
}

export default function ImageTile({ item, index }: ImageTileProps) {
  // Generate arbitrary apparel data for hover tooltips
  const getApparelData = (itemId: number) => {
    const apparelNames = [
      "Vintage Denim Jacket",
      "Urban Street Hoodie", 
      "Classic White Tee",
      "Retro Graphic Sweatshirt",
      "Minimalist Black Hoodie",
      "Vintage Band Tee",
      "Streetwear Crop Top",
      "Oversized Flannel",
      "Distressed Denim",
      "Athletic Joggers",
      "Canvas Sneakers",
      "Leather Backpack",
      "Baseball Cap",
      "Beanie Hat",
      "Canvas Tote Bag"
    ];
    
    const prices = [29, 45, 19, 35, 42, 25, 22, 38, 55, 32, 89, 75, 18, 15, 28];
    
    const nameIndex = itemId % apparelNames.length;
    const priceIndex = itemId % prices.length;
    
    return {
      name: apparelNames[nameIndex],
      price: prices[priceIndex]
    };
  };

  const isApparel = item.category.toLowerCase() === 'apparel';
  const apparelData = isApparel ? getApparelData(item.id) : null;

  return (
    <div className="group cursor-pointer h-full">
      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          loading={index === 0 ? "eager" : "lazy"}
        />
        
        {/* Apparel Hover Tooltip */}
        {isApparel && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
            <div className="text-white p-4 pb-6 w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{apparelData?.name}</h3>
                <p className="text-xl font-bold">{apparelData?.price}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
