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
  { id: 'bio', name: 'Bio', icon: UserIcon, href: '/about' },
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
    <div className="h-screen">
      <motion.div
        className="h-full bg-black text-white z-40"
        initial={{ x: -64 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col h-full">
        {/* Header / Home */}
        <div className="px-6 pt-6 pb-2">
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
                className="flex items-center rounded-lg transition-colors group justify-center p-3 w-full"
              >
                <HomeIcon className="w-7 h-7 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors" />
              </Link>
            </Tooltip>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between">
          {/* Top Section - Essentials (Bio, etc.) */}
          <div className="px-4 pt-2 pb-4">
            <div className="space-y-1">
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
          <div className="p-4">
            <div className="space-y-1">
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
