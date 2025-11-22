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
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      {/* Sidebar - Bottom on mobile, Left on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:relative md:w-16 md:h-screen md:flex-shrink-0">
        <div className="h-full w-full md:sticky md:top-0 md:h-screen">
          {showSidebar && <SideBar />}
        </div>
      </div>

      {/* Content */}
      <ContentWrapper>
        <div className="mb-20 md:mb-0">
          {children}
        </div>
      </ContentWrapper>
    </div>
  );
}

