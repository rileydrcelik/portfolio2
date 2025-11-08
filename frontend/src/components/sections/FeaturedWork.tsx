'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const featuredWork = [
  {
    id: 1,
    title: 'Digital Art Collection',
    description: 'A series of digital paintings exploring themes of nature and technology.',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=225&fit=crop&crop=center',
    category: 'Artwork',
    href: '/artwork',
  },
  {
    id: 2,
    title: 'Music Production',
    description: 'Original compositions blending electronic and acoustic elements.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=225&fit=crop&crop=center',
    category: 'Music',
    href: '/music',
  },
  {
    id: 3,
    title: 'Web Development',
    description: 'Full-stack applications built with modern technologies.',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop&crop=center',
    category: 'Projects',
    href: '/projects',
  },
];

export default function FeaturedWork() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Featured Work
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            A selection of my most recent and notable creative projects across different mediums.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {featuredWork.map((work, index) => (
            <motion.div
              key={work.id}
              className="group relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-200">
                <Image
                  src={work.image}
                  alt={work.title}
                  width={400}
                  height={225}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-x-2 text-sm">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {work.category}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  <Link href={work.href}>
                    <span className="absolute inset-0" />
                    {work.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-gray-600">{work.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/projects"
            className="inline-flex items-center rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            View All Work
          </Link>
        </div>
      </div>
    </div>
  );
}
