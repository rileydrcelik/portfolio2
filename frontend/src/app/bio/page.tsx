import SectionWithFeed from '@/components/sections/SectionWithFeed';

export const revalidate = 0;

export default function BioPage() {
  return (
    <SectionWithFeed
      title="Bio"
      directory="pinterest_placeholders"
      category="bio"
      categorySlug="bio"
      useDatabase={true}
    />
  );
}
