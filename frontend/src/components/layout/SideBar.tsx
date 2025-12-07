'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tooltip } from '@chakra-ui/react';
import {
  HomeIcon,
  UserIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import GlassTooltipLabel from '../ui/GlassTooltipLabel';
import SubpagesContainer from './SubpagesContainer';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const essentials: NavigationItem[] = [
  { id: 'bio', name: 'Bio', icon: UserIcon, href: '/bio' },
];

const settings: NavigationItem[] = [
  { id: 'settings', name: 'Settings', icon: Cog6ToothIcon, href: '/settings' },
];

interface NavigationLinkProps {
  item: NavigationItem;
  index: number;
  delay: number;
}

const NavigationLink: React.FC<NavigationLinkProps> = ({ item, index, delay }) => {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay + index * 0.1 }}
    >
      <Tooltip
        placement="right"
        hasArrow={false}
        offset={[0, 20]}
        bg="transparent"
        p={0}
        label={<GlassTooltipLabel text={item.name} />}
      >
        <Link
          href={item.href}
          className="flex items-center rounded-lg transition-colors group justify-center p-3 w-full"
        >
          <item.icon className="w-7 h-7 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors" />
        </Link>
      </Tooltip>
    </motion.div>
  );
};

export default function SideBar() {
  return (
    <div className="h-16 md:h-screen w-full md:w-auto">
      <motion.div
        className="h-full bg-black/90 backdrop-blur-md md:bg-black text-white z-40 border-t border-white/10 md:border-t-0"
        initial={{ y: 64, x: 0 }}
        animate={{ y: 0, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-row md:flex-col h-full justify-between items-center md:items-stretch px-4 md:px-0">
          {/* Header / Home */}
          <div className="md:px-6 md:pt-6 md:pb-2">
            <div className="flex items-center justify-center">
              <Tooltip
                placement="right"
                hasArrow={false}
                offset={[0, 20]}
                bg="transparent"
                p={0}
                label={<GlassTooltipLabel text="Home" />}
              >
                <Link
                  href="/"
                  className="flex items-center rounded-lg transition-colors group justify-center p-2 md:p-3"
                >
                  <HomeIcon className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors" />
                </Link>
              </Tooltip>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-row md:flex-col justify-start md:justify-between items-center md:items-stretch gap-4 md:gap-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Top Section - Essentials (Bio, etc.) */}
            <div className="md:px-4 md:pt-2 md:pb-4">
              <div className="flex flex-row md:flex-col gap-1 md:gap-0 md:space-y-1">
                {essentials.map((item, index) => (
                  <NavigationLink
                    key={item.id}
                    item={item}
                    index={index}
                    delay={0.3}
                  />
                ))}
              </div>
            </div>

            {/* Middle Section - Subpages with rounded container */}
            <SubpagesContainer />

            {/* Bottom Section - Settings */}
            <div className="md:p-4">
              <div className="flex flex-row md:flex-col gap-1 md:gap-0 md:space-y-1">
                {settings.map((item, index) => (
                  <NavigationLink
                    key={item.id}
                    item={item}
                    index={index}
                    delay={0.8}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
