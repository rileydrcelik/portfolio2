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
  };
  fallbackHref: string;
}

export default function PostModalClient({ post, fallbackHref }: PostModalClientProps) {
  const router = useRouter();
  const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(post.content_url);
  const image = post.thumbnail_url || post.splash_image_url || post.content_url;

  const handleClose = () => {
    router.push(fallbackHref);
  };

  return (
    <div className="min-h-screen bg-black">
      <ImageModal
        isOpen={true}
        onClose={handleClose}
        image={image}
        title={post.title}
        description={post.description}
        date={post.date}
        tags={post.tags}
        contentUrl={post.content_url}
        isAudio={isAudio}
        slug={post.slug}
        category={post.category}
        album={post.album}
      />
    </div>
  );
}
