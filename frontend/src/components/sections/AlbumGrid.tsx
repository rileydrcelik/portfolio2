'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface Album {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  contentCount: number;
}

interface AlbumGridProps {
  albums: Album[];
}

export default function AlbumGrid({ albums }: AlbumGridProps) {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Collections
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Explore my work organized by themes and styles.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              className="group relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link href={`/music/${album.slug}`}>
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-200">
                  <Image
                    src={album.coverImage}
                    alt={album.name}
                    width={400}
                    height={225}
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {album.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">{album.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{album.contentCount} items</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}





