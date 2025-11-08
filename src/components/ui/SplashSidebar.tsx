'use client';

import { motion } from 'framer-motion';
import {
  HomeIcon,
  UserIcon,
  PaintBrushIcon,
  CameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface SplashSidebarProps {
  fadeOut?: number;
}

export default function SplashSidebar({ fadeOut = 1 }: SplashSidebarProps) {
  return (
    <div
      className="fixed left-4 top-1/2 transform -translate-y-1/2 w-16 backdrop-blur-sm text-white z-50 rounded-2xl py-8 shadow-lg"
      style={{ 
        height: 'calc(100vh - 4rem)',
        backgroundColor: 'rgba(255, 255, 255, 0.175)'
      }}
    >
      <div className="flex flex-col h-full items-center space-y-6 px-2">
        {/* Home */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <HomeIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <UserIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Artwork */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <PaintBrushIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Photography */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <CameraIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Music */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <MusicalNoteIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Projects */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
        >
          <CodeBracketIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Apparel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ShoppingBagIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>

        {/* Spacer for text in the middle */}
        <div className="flex-1" />
        
        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Cog6ToothIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        </motion.div>
      </div>
    </div>
  );
}

