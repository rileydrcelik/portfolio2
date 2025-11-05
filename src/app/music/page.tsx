import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'beats', name: 'Beats', count: 0 },
  { id: 'singles', name: 'Singles', count: 0 },
];

export default function MusicPage() {
  return (
    <SectionWithFeed
      title="Music"
      directory="pinterest_placeholders"
      albums={albums}
    />
  );
}