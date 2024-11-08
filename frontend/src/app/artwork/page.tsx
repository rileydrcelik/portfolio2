import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'pencil_album', name: 'studies', count: 0 },
  { id: 'pieces_album', name: 'illustration', count: 0 },
  { id: 'portraits_album', name: 'portraits', count: 0 },
  { id: 'sketchbook_album', name: 'sketchbook', count: 0 },
  { id: 'studies_album', name: 'pencil', count: 0 },
];

export default function ArtworkPage() {
  return (
    <SectionWithFeed
      title="Art"
      directory="art_placeholders"
      albums={albums}
      category="art"
      useDatabase={true}
    />
  );
}
