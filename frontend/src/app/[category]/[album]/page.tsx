import SectionWithFeed from '@/components/sections/SectionWithFeed';
import { getCategoryConfig } from '@/lib/categories';
import { notFound } from 'next/navigation';

export const revalidate = 0;

interface AlbumPageProps {
  params: Promise<{
    category: string;
    album: string;
  }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { category, album } = await params;
  const config = getCategoryConfig(category);

  if (!config) {
    notFound();
  }

  const albumSlug = decodeURIComponent(album);

  return (
    <SectionWithFeed
      title={config.title}
      directory={config.directory}
      category={config.slug}
      categorySlug={config.slug}
      useDatabase={true}
      initialAlbum={albumSlug}
    />
  );
}
