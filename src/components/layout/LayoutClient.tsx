'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import ContentWrapper from './ContentWrapper';

interface LayoutClientProps {
  children: React.ReactNode;
}

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  
  // Initialize based on page type - hide on home page initially
  const [showSidebar, setShowSidebar] = useState(!isHomePage);

  useEffect(() => {
    // Don't adjust on non-home pages - always show sidebar
    if (!isHomePage) {
      setShowSidebar(true);
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Show sidebar after scrolling past 80% of splash (earlier appearance)
          const showThreshold = window.innerHeight * 0.8;
          setShowSidebar(window.scrollY >= showThreshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial position on home page immediately
    const checkInitial = () => {
      const showThreshold = window.innerHeight * 0.8;
      setShowSidebar(window.scrollY >= showThreshold);
    };
    checkInitial();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar - always maintains space but conditionally visible */}
      <div className="w-16 flex-shrink-0">
        <div className="sticky top-0 h-screen">
          {showSidebar && <SideBar />}
        </div>
      </div>
      
      {/* Content */}
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </div>
  );
}

