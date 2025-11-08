'use client';

import { motion } from 'framer-motion';

export default function Webring() {
  return (
    <div className="fixed top-1/2 right-0 transform translate-x-16 -translate-y-1/2 z-50">
      <motion.div
        className="w-32 h-32 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-white rounded-full"></div>
        </div>
      </motion.div>
    </div>
  );
}
