'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlayIcon } from '@heroicons/react/24/solid';

interface SongTileProps {
  item: {
    id: number;
    title: string;
    description: string;
    category: string;
  };
}

export default function SongTile({ item }: SongTileProps) {
  return (
    <Link href={`/post/${item.id}`}>
      <div className="group cursor-pointer h-full">
        <div className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-between px-4">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
            <p className="text-white/80 text-xs truncate">{item.description}</p>
          </div>
          <div className="flex-shrink-0 ml-3">
            <PlayIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </Link>
  );
}


