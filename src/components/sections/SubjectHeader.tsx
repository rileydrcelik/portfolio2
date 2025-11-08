'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface SubjectHeaderProps {
  title: string;
  description: string;
  coverImage?: string;
}

export default function SubjectHeader({ title, description, coverImage }: SubjectHeaderProps) {
  return (
    <div className="relative bg-gray-900">
      {coverImage && (
        <div className="absolute inset-0">
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover opacity-30"
          />
        </div>
      )}
      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="text-4xl font-bold tracking-tight text-white sm:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-6 text-lg leading-8 text-gray-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {description}
          </motion.p>
        </div>
      </div>
    </div>
  );
}


