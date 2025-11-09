'use client';

import { useRouter } from 'next/navigation';
import ImageModal from '@/components/ui/ImageModal';

interface PostModalClientProps {
  post: {
    id: string;
    title: string;
    description: string;
    date?: string;
    tags?: string[];
    content_url: string;
    thumbnail_url: string;
    splash_image_url?: string | null;
    slug: string;
    category: string;
    album: string;
    price?: number | null;
    gallery_urls?: string[] | null;
  };
  fallbackHref: string;
}

export default function PostModalClient({ post, fallbackHref }: PostModalClientProps) {
  const router = useRouter();
  const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(post.content_url);
  const looksLikeText = post.category === 'bio' || (post.content_url && !/^https?:\/\//i.test(post.content_url));
  const imageCandidate = post.thumbnail_url || post.splash_image_url || (looksLikeText ? '' : post.content_url);

  const handleClose = () => {
    router.push(fallbackHref);
  };

  return (
    <div className="min-h-screen bg-black">
      <ImageModal
        isOpen={true}
        onClose={handleClose}
        image={imageCandidate}
        title={post.title}
        description={post.description}
        date={post.date}
        tags={post.tags}
        contentUrl={post.content_url}
        isAudio={isAudio}
        slug={post.slug}
        category={post.category}
        album={post.album}
        isText={looksLikeText && !imageCandidate}
        price={post.price ?? null}
        galleryUrls={post.gallery_urls}
      />
    </div>
  );
}
