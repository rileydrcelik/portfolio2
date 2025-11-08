import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'pencil_album', name: 'studies', count: 3 },
  { id: 'pieces_album', name: 'illustration', count: 4 },
  { id: 'portraits_album', name: 'portraits', count: 9 },
  { id: 'sketchbook_album', name: 'sketchbook', count: 7 },
  { id: 'studies_album', name: 'studies', count: 12 },
];

export default function ArtworkPage() {
  return (
    <SectionWithFeed
      title="Art"
      directory="art_placeholders"
      albums={albums}
    />
  );
}