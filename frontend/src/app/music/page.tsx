import SectionWithFeed from '@/components/sections/SectionWithFeed';

export default function MusicPage() {
  return (
    <SectionWithFeed
      title="Music"
      directory="music_placeholders"
      category="music"
      categorySlug="music"
      useDatabase={true}
    />
  );
}