'use client';

import { useState } from 'react';
import SectionHeader from './SectionHeader';
import Feed from './Feed';

interface Album {
  id: string;
  name: string;
  count: number;
}

interface SectionWithFeedProps {
  title: string;
  directory: string;
  albums: Album[];
}

export default function SectionWithFeed({ title, directory, albums }: SectionWithFeedProps) {
  const [activeAlbum, setActiveAlbum] = useState('all');

  // Calculate total count
  const totalCount = albums.reduce((sum, album) => sum + album.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Section Header with Album Filtering */}
      <SectionHeader
        title={title}
        totalCount={totalCount}
        albums={albums}
        activeAlbum={activeAlbum}
        onAlbumChange={setActiveAlbum}
      />
      
      {/* Feed with Filtering */}
      <Feed
        directory={directory}
        activeAlbum={activeAlbum}
        onAlbumChange={setActiveAlbum}
      />
    </div>
  );
}




