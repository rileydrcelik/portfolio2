'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

export default function PostModalClient({ post: initialPost, fallbackHref }: PostModalClientProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(post.content_url);
  const looksLikeText =
    post.category === 'bio' ||
    (!!post.content_url && !/^https?:\/\//i.test(post.content_url));
  const imageCandidate =
    post.thumbnail_url || post.splash_image_url || (looksLikeText ? null : post.content_url);

  const handleClose = () => {
    // Check if there is history (length > 1 usually implies we can go back)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  const handleUpdate = (updatedPost: any) => {
    setPost({
      ...post,
      ...updatedPost,
    });
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
        isText={Boolean(looksLikeText && !imageCandidate && post.category !== 'projects')}
        price={post.price ?? null}
        galleryUrls={post.gallery_urls ?? undefined}
        postId={post.id}
        canEdit={true}
        post={{
          ...post,
          gallery_urls: post.gallery_urls ?? undefined,
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
