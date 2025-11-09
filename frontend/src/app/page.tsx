'use client';

import { useEffect, useState } from 'react';
import Feed from '@/components/sections/Feed';
import SplashSection from '@/components/sections/SplashSection';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
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

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Feed fades in and slides up as you scroll past the splash
  const fadeStart = windowHeight * 0.5;
  const fadeEnd = windowHeight * 1.0;
  const feedOpacity = windowHeight > 0 ? Math.max(0, Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart))) : 0;
  
  // Slide up from 100px below
  const translateY = (1 - feedOpacity) * 100;

  return (
    <div className="min-h-screen bg-black">
      {/* Splash Section - extends to cover sidebar area */}
      <div className="relative -ml-16 w-[calc(100%+4rem)]">
        <SplashSection />
      </div>
      
      {/* Feed - fades in and slides up as splash fades out */}
      <div 
        style={{ 
          opacity: feedOpacity, 
          transform: `translateY(${translateY}px)`,
          transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
          willChange: 'opacity, transform'
        }}
      >
        <Feed
          directory="pinterest_placeholders"
          useDatabase={true}
          limit={50}
        />
      </div>
    </div>
  );
}