import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'hackharvard', name: 'hackharvard', count: 26 },
  { id: 'hackknight', name: 'hackknight', count: 18 },
  { id: 'mhacks', name: 'mhacks', count: 35 },
];

export default function PhotographyPage() {
  return (
    <SectionWithFeed
      title="Photography"
      directory="photo_placeholders"
      albums={albums}
    />
  );
}

