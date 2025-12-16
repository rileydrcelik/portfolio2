import SectionWithFeed from '@/components/sections/SectionWithFeed';

export default function ShopPage() {
  return (
    <SectionWithFeed
      title="Shop"
      directory="apparel_placeholders"
      category="apparel"
      categorySlug="shop"
      useDatabase={true}
    />
  );
}
