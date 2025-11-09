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
    isText?: boolean;
    price?: number | null;
  };
  index: number;
}

export default function ImageTile({ item, index }: ImageTileProps) {
  const isText = item.isText || (!item.image && item.category.toLowerCase() === 'bio');

  return (
    <div className="group cursor-pointer h-full">
      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
        {isText ? (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black/60 text-white p-6 flex flex-col justify-end">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold line-clamp-3">{item.title}</h3>
              <p className="text-sm text-white/70 line-clamp-4">{item.description}</p>
            </div>
          </div>
        ) : (
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
      </div>
    </div>
  );
}
