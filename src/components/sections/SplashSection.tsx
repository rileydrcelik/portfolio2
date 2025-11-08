'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import SplashSidebar from '@/components/ui/SplashSidebar';

export default function SplashSection() {
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  
  useEffect(() => {
    setWindowHeight(window.innerHeight);
    
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth fade out starting from 50% scroll through the splash
  const fadeStart = windowHeight * 0.5; // Start fading at 50% through viewport
  const fadeEnd = windowHeight * 1.0; // Fully faded at end of viewport
  const fadeOut = windowHeight > 0 ? Math.max(0, Math.min(1, (fadeEnd - scrollY) / (fadeEnd - fadeStart))) : 1;
  
  // Scroll indicator fades out faster - starts fading immediately on scroll
  const scrollIndicatorOpacity = windowHeight > 0 ? Math.max(0, Math.min(1, (windowHeight * 0.3 - scrollY) / (windowHeight * 0.3))) : 1;
  
  return (
    <div className="relative h-screen w-full overflow-hidden pointer-events-none">
      {/* Custom Splash Sidebar - fades out when scrolling */}
      <div style={{ opacity: fadeOut, transition: 'opacity 0.4s ease-out', willChange: 'opacity' }}>
        <SplashSidebar />
      </div>
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ 
          opacity: fadeOut,
          transition: 'opacity 0.4s ease-out',
          willChange: 'opacity'
        }}
      >
        <Image
          src="/splash.jpg"
          alt="Splash"
          fill
          className="object-cover pointer-events-none select-none"
          priority
          quality={90}
          draggable={false}
        />
        
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        
        {/* Bottom fade-out gradient for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Content Overlay - Title positioned to break the sidebar */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 px-4 pointer-events-auto">
        <motion.div
          className="max-w-4xl"
          initial={{ opacity: 0, x: -50, y: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ 
            opacity: fadeOut,
            transition: 'opacity 0.4s ease-out',
            willChange: 'opacity'
          }}
        >
          <h1 className="text-6xl md:text-8xl font-serif text-white mb-4 select-none">
            PICNIC
          </h1>
          <p className="text-xl md:text-2xl text-white/50 font-serif select-none">
            short description of the project...
          </p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: scrollIndicatorOpacity, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ willChange: 'opacity' }}
      >
        <span className="text-white text-sm font-medium mb-2 select-none">scroll</span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <ChevronDownIcon className="w-6 h-6 text-white" />
          <ChevronDownIcon className="w-6 h-6 text-white -mt-4" />
        </motion.div>
      </motion.div>
    </div>
  );
}

