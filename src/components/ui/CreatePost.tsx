'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import PostModal from './PostModal';

export default function CreatePost() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-white backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            default: { duration: 0.3, delay: 0.2 },
            hover: { duration: 0.1, ease: "easeOut" },
            tap: { duration: 0.08, ease: "easeOut" }
          }}
        >
          <PlusIcon className="w-6 h-6" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <PostModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
