'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tooltip } from '@chakra-ui/react';
import {
  PaintBrushIcon,
  CameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  ShoppingBagIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import GlassTooltipLabel from '../ui/GlassTooltipLabel';

// Navigation items for subpages
interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const subpages: NavigationItem[] = [
  { id: 'bio', name: 'Bio', icon: UserIcon, href: '/bio' },
  { id: 'art', name: 'Art', icon: PaintBrushIcon, href: '/art' },
  { id: 'photography', name: 'Photography', icon: CameraIcon, href: '/photo' },
  { id: 'music', name: 'Music', icon: MusicalNoteIcon, href: '/music' },
  { id: 'projects', name: 'Projects', icon: CodeBracketIcon, href: '/projects' },
  { id: 'apparel', name: 'Apparel', icon: ShoppingBagIcon, href: '/apparel' },
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

interface SubpagesContainerProps {
  className?: string;
}

export default function SubpagesContainer({
  className = 'px-2 py-2 -mt-16',
}: SubpagesContainerProps) {
  return (
    <div className={className}>
      <div
        className="rounded-2xl p-3 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
      >
        <div className="space-y-1">
          {subpages.map((item, index) => (
            <NavigationLink
              key={item.id}
              item={item}
              index={index}
              delay={0.4}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
