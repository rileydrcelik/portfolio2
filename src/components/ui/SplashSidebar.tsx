'use client';

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
      className="fixed left-4 top-1/2 transform -translate-y-1/2 w-16 backdrop-blur-sm text-white rounded-2xl shadow-lg"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.175)'
      }}
    >
      <div className="flex flex-col items-center px-2 py-8" style={{ gap: '1.5rem' }}>
        {/* Top group - 3 icons above text */}
        <HomeIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <UserIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <PaintBrushIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        
        {/* Bottom group - 5 icons below text */}
        <CameraIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <MusicalNoteIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <CodeBracketIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <ShoppingBagIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
        <Cog6ToothIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" />
      </div>
    </div>
  );
}

