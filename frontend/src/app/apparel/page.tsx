import SectionWithFeed from '@/components/sections/SectionWithFeed';

export default function ApparelPage() {
  return (
    <SectionWithFeed
      title="Apparel"
      directory="apparel_placeholders"
      category="apparel"
      categorySlug="apparel"
      useDatabase={true}
    />
  );
}