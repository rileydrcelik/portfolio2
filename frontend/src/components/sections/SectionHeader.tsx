'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { Filter } from 'lucide-react';

interface Album {
  id: string;
  name: string;
  count: number;
}

interface SectionHeaderProps {
  title: string;
  totalCount: number;
  albums: Album[];
  activeAlbum: string;
  onAlbumChange: (albumId: string) => void;
  tags?: string[];
  activeTag?: string;
  onTagChange?: (tag: string) => void;
}

export default function SectionHeader({ 
  title, 
  totalCount, 
  albums, 
  activeAlbum, 
  onAlbumChange,
  tags = [],
  activeTag = '',
  onTagChange
}: SectionHeaderProps) {
  // Get the active album info
  const activeAlbumInfo = albums.find(album => album.id === activeAlbum);

  return (
    <div className="pl-4 pr-4 py-8 bg-black">
      <div className="max-w-6xl">
        {/* Main Title with Tag Filter */}
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-4xl text-white">
            <span className="font-bold">{title}</span>
            <AnimatePresence mode="wait">
              <motion.span 
                key={activeAlbum}
                className="font-normal text-2xl"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {activeAlbum === 'all' ? (
                  ` - ${totalCount} posts`
                ) : (
                  ` - ${activeAlbumInfo?.name} - ${activeAlbumInfo?.count} posts`
                )}
              </motion.span>
            </AnimatePresence>
          </h1>
          
          {/* Tag Filter Dropdown */}
          {tags.length > 0 && onTagChange && (
            <div className="flex items-center relative">
              <Menu placement="bottom" offset={[0, 8]}>
                <MenuButton
                  as="button"
                  className="group cursor-pointer"
                  bg="transparent"
                  border="none"
                  p="0"
                  _hover={{ bg: "transparent" }}
                  _active={{ bg: "transparent" }}
                >
                  <Filter className="w-5 h-5 text-white transition-opacity group-hover:opacity-60 translate-y-1" />
                </MenuButton>
                <MenuList
                  bg="rgba(255, 255, 255, 0.175)"
                  backdropFilter="blur(4px)"
                  border="1px solid rgba(255, 255, 255, 0.2)"
                  borderRadius="10px"
                  minW="150px"
                  py="2"
                  transform="translateX(-50%)"
                  left="50%"
                  zIndex={1000}
                  sx={{
                    '& > *': {
                      color: 'white',
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => onTagChange('')}
                    bg={activeTag === '' ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                    _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
                    justifyContent="center"
                    textAlign="center"
                    py="3"
                    transition="all 0.5s ease"
                    sx={{
                      transition: 'background-color 0.5s ease',
                    }}
                  >
                    All tags
                  </MenuItem>
                  {tags.map((tag) => (
                    <MenuItem
                      key={tag}
                      onClick={() => onTagChange(tag)}
                      bg={activeTag === tag ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                      _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
                      justifyContent="center"
                      textAlign="center"
                      py="3"
                      transition="all 0.5s ease"
                      sx={{
                        transition: 'background-color 0.5s ease',
                      }}
                    >
                      {tag}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </div>
          )}
        </div>

        {/* Album Filter Links */}
        <motion.div 
          className="flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            onClick={() => onAlbumChange('all')}
            className={`text-white hover:text-gray-300 transition-colors pb-1 ${
              activeAlbum === 'all' ? 'border-b-2 border-white' : ''
            }`}
          >
            all
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onAlbumChange(album.id)}
              className={`text-white hover:text-gray-300 transition-colors pb-1 ${
                activeAlbum === album.id ? 'border-b-2 border-white' : ''
              }`}
            >
              {album.name}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
