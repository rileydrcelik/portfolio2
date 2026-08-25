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
    post_type?: string;
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
  const [isOpen, setIsOpen] = useState(true);
  const isAudio = post.category === 'music' || /\.(mp3|wav|ogg|m4a|flac)$/i.test(post.content_url);
  const looksLikeText =
    post.category === 'bio' ||
    (!!post.content_url && !/^https?:\/\//i.test(post.content_url));
  const imageCandidate =
    post.thumbnail_url || post.splash_image_url || (looksLikeText ? null : post.content_url);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleExitComplete = () => {
    if (typeof window === 'undefined') return;

    // window.history.length is not a usable signal for "can we go back": it
    // counts the tab's earlier entries, including other origins, so a pasted
    // or shared link usually reports > 1. router.back() then either leaves the
    // site or does nothing at all, stranding the viewer on this page's bare
    // black background with the modal already gone.
    //
    // Compare the URL the document was loaded at instead. This page is only
    // ever entered by a client-side navigation (the splash link) or by a fresh
    // load straight onto the post. If the document loaded at this very post
    // there is nothing of ours behind it, so the album page is where exiting
    // belongs, and replace() keeps the dead post URL out of history.
    const [navEntry] = performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];

    const enteredDirectly =
      !navEntry ||
      new URL(navEntry.name, window.location.origin).pathname ===
        window.location.pathname;

    if (enteredDirectly) {
      router.replace(fallbackHref);
    } else {
      router.back();
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
        isOpen={isOpen}
        onClose={handleClose}
        onExitComplete={handleExitComplete}
        image={imageCandidate}
        title={post.title}
        description={post.description}
        tags={post.tags}
        contentUrl={post.content_url}
        isAudio={isAudio}
        slug={post.slug}
        category={post.category}
        album={post.album}
        isText={Boolean(looksLikeText && !imageCandidate && post.category !== 'projects')}
        postType={post.post_type}
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
