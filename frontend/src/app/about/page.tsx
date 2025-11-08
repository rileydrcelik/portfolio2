import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums = [
  { id: 'quote_of_the_day', name: 'Quote of the day', count: 0 },
  { id: 'new_music', name: 'New music', count: 0 },
  { id: 'rankings', name: 'Rankings', count: 0 },
  { id: 'bio', name: 'Bio', count: 0 },
  { id: 'resume', name: 'Resume', count: 0 },
];

export default function AboutPage() {
  return (
    <SectionWithFeed
      title="Bio"
      directory="pinterest_placeholders"
      albums={albums}
    />
  );
}
