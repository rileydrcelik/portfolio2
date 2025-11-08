import SectionWithFeed from '@/components/sections/SectionWithFeed';

const albums: { id: string; name: string; count: number }[] = [];

export default function ShopPage() {
  return (
    <SectionWithFeed
      title="Shop"
      directory="apparel_placeholders"
      albums={albums}
    />
  );
}

