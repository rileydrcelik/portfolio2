import PostModalClient from '@/components/ui/PostModalClient';
import { getCategoryConfig } from '@/lib/categories';
import { getPostBySlug } from '@/lib/api';
import { notFound } from 'next/navigation';

interface PostPageProps {
  params: Promise<{
    category: string;
    album: string;
    slug: string;
  }>;
}

export default async function PostModalPage({ params }: PostPageProps) {
  const { category, album, slug } = await params;
  const config = getCategoryConfig(category);

  if (!config) {
    notFound();
  }

  const albumSlug = decodeURIComponent(album);
  const post = await getPostBySlug(decodeURIComponent(slug)).catch(() => null);

  if (!post || post.category !== config.slug || post.album !== albumSlug) {
    notFound();
  }

  const fallback = `/${config.slug}/${albumSlug}`;

  return (
    <PostModalClient post={{ ...post, description: post.description || '' }} fallbackHref={fallback} />
  );
}