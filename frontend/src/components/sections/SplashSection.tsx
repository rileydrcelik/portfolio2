'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon, HomeIcon, UserIcon, PaintBrushIcon, CameraIcon, MusicalNoteIcon, CodeBracketIcon, ShoppingBagIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { Tooltip } from '@chakra-ui/react';
import GlassTooltipLabel from '@/components/ui/GlassTooltipLabel';
import { getPosts, Post } from '@/lib/api';

export default function SplashSection() {
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const [titleVisible, setTitleVisible] = useState(false);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setWindowHeight(window.innerHeight);

    // Trigger title fade-in after a brief delay
    setTimeout(() => {
      setTitleVisible(true);
    }, 300);

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

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setIsLoadingPost(true);
        const posts = await getPosts({ is_major: true, limit: 1 });
        if (posts.length > 0) {
          setFeaturedPost(posts[0]);
        } else {
          setFeaturedPost(null);
        }
      } catch (error) {
        console.error('[SplashSection] Failed to fetch featured post:', error);
        setFeaturedPost(null);
      } finally {
        setIsLoadingPost(false);
      }
    };

    fetchFeatured();
  }, []);

  const featuredImageUrl = useMemo(() => {
    if (!featuredPost) return null;
    const content = featuredPost.content_url?.trim() ?? '';
    const thumb = featuredPost.thumbnail_url?.trim() ?? '';
    const splash = featuredPost.splash_image_url?.trim() ?? '';

    const looksLikeMarkdown = content.includes('\n') || content.includes('#') || content.includes('![');
    const isValidUrl = (value: string) => {
      if (!value) return false;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch (err) {
        return false;
      }
    };

    if (isValidUrl(splash)) {
      return splash;
    }

    if (!looksLikeMarkdown && isValidUrl(content)) {
      return content;
    }

    if (isValidUrl(thumb)) {
      return thumb;
    }

    return null;
  }, [featuredPost]);

  useEffect(() => {
    setImageLoaded(false);
  }, [featuredImageUrl]);

  // Smooth fade out starting from 50% scroll through the splash
  const fadeStart = windowHeight * 0.5; // Start fading at 50% through viewport
  const fadeEnd = windowHeight * 1.0; // Fully faded at end of viewport
  const fadeOut = windowHeight > 0 ? Math.max(0, Math.min(1, (fadeEnd - scrollY) / (fadeEnd - fadeStart))) : 1;

  // Sidebar animation reversal - starts at 0% and goes faster than scroll
  const sidebarSpeedMultiplier = 1.75; // Makes it reverse 1.75x faster than scroll
  const effectiveScrollY = scrollY * sidebarSpeedMultiplier;
  const sidebarFadeEnd = windowHeight * 1.0;
  const sidebarFadeOut = windowHeight > 0 ? Math.max(0, Math.min(1, (sidebarFadeEnd - effectiveScrollY) / sidebarFadeEnd)) : 1;

  // Title opacity: fade in on mount, then fade out on scroll
  const titleOpacity = titleVisible ? fadeOut : 0;

  // Scroll indicator fades out faster - starts fading immediately on scroll
  const scrollIndicatorOpacity = windowHeight > 0 ? Math.max(0, Math.min(1, (windowHeight * 0.3 - scrollY) / (windowHeight * 0.3))) : 1;

  return (
    <>
      {/* Top Splash Sidebar - first 4 icons */}
      <div
        className="absolute left-0 top-0 h-full w-full pointer-events-none z-50"
        style={{
          opacity: fadeOut,
          transition: 'opacity 0.4s ease-out',
          willChange: 'opacity'
        }}
      >
        <motion.div
          className="absolute left-4 top-[calc(50%-18rem)] w-16 backdrop-blur-sm text-white rounded-t-2xl pointer-events-auto"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.175)',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.175) 0%, rgba(255, 255, 255, 0) 100%)'
          }}
          initial={{ y: 288, opacity: 0 }}
          animate={{
            y: 288 * (1 - sidebarFadeOut),
            opacity: sidebarFadeOut
          }}
          transition={{
            duration: scrollY > 0 ? 0 : 1.2,
            ease: scrollY > 0 ? "linear" : [0.04, 0.62, 0.23, 0.98]
          }}
        >
          <div className="flex flex-col items-center px-2 pb-4 pt-6 pointer-events-auto" style={{ gap: '1.5rem' }}>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Home" />}
            >
              <Link href="/"><HomeIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Bio" />}
            >
              <Link href="/about"><UserIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Art" />}
            >
              <Link href="/art"><PaintBrushIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Photography" />}
            >
              <Link href="/photo"><CameraIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
          </div>
        </motion.div>
      </div>

      {/* Bottom Splash Sidebar - last 4 icons */}
      <div
        className="absolute left-0 top-0 h-full w-full pointer-events-none z-50"
        style={{
          opacity: fadeOut,
          transition: 'opacity 0.4s ease-out',
          willChange: 'opacity'
        }}
      >
        <motion.div
          className="absolute left-4 top-[calc(50%+6rem)] w-16 backdrop-blur-sm text-white rounded-b-2xl pointer-events-auto"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.175)',
            background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.175) 0%, rgba(255, 255, 255, 0) 100%)'
          }}
          initial={{ y: -96, opacity: 0 }}
          animate={{
            y: -96 * (1 - sidebarFadeOut),
            opacity: sidebarFadeOut
          }}
          transition={{
            duration: scrollY > 0 ? 0 : 1.2,
            delay: scrollY > 0 ? 0 : 0.1,
            ease: scrollY > 0 ? "linear" : [0.04, 0.62, 0.23, 0.98]
          }}
        >
          <div className="flex flex-col items-center px-2 pt-4 pb-6 pointer-events-auto" style={{ gap: '1.5rem' }}>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Music" />}
            >
              <Link href="/music"><MusicalNoteIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Projects" />}
            >
              <Link href="/projects"><CodeBracketIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Apparel" />}
            >
              <Link href="/apparel"><ShoppingBagIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
            <Tooltip
              placement="right"
              hasArrow={false}
              offset={[0, 20]}
              bg="transparent"
              p={0}
              label={<GlassTooltipLabel text="Settings" />}
            >
              <Link href="/settings"><Cog6ToothIcon className="w-6 h-6 text-white/70 hover:text-white transition-colors cursor-pointer" /></Link>
            </Tooltip>
          </div>
        </motion.div>
      </div>

      <div className="relative h-screen w-full overflow-hidden pointer-events-none">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            opacity: fadeOut,
            transition: 'opacity 0.4s ease-out',
            willChange: 'opacity'
          }}
        >
          <div className="absolute inset-0 bg-black" />
          {featuredImageUrl && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Image
                src={featuredImageUrl}
                alt={featuredPost?.title ?? 'Splash'}
                fill
                className="object-cover pointer-events-none select-none"
                priority
                quality={90}
                draggable={false}
                onLoadingComplete={() => setImageLoaded(true)}
              />
            </motion.div>
          )}

          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

          {/* Bottom fade-out gradient for smooth transition */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
        </div>

        {/* Content Overlay - Title positioned to break the sidebar */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-50 px-4 pointer-events-auto">
          <div
            className="max-w-4xl"
            style={{
              opacity: titleOpacity,
              transition: 'opacity 0.4s ease-out',
              willChange: 'opacity'
            }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-serif text-white mb-1 select-none leading-tight">
              {featuredPost?.title || 'PICNIC'}
            </h1>
            <p className="text-xl md:text-2xl text-white/50 font-serif select-none">
              {featuredPost?.description || 'short description of the project...'}
            </p>
          </div>
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
    </>
  );
}

