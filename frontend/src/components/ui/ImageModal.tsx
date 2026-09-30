'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Star, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Post, updatePost } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import EditPostModal from './EditPostModal';
import NowPlayingTile from '@/components/ui/NowPlayingTile';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image?: string | null;
  title: string;
  description: string;
  postId?: string;
  onDelete?: (postId: string) => void;
  contentUrl?: string;
  isAudio?: boolean;
  slug?: string;
  category?: string;
  album?: string;
  isText?: boolean;
  /** Post type from the database; 'note' marks an embedded w_notes note. */
  postType?: string;
  price?: number | null;
  galleryUrls?: string[];
  canEdit?: boolean;
  post?: Pick<Post, 'content_url' | 'thumbnail_url' | 'splash_image_url' | 'gallery_urls'>;
  isActive?: boolean;
  isFavorite?: boolean;
  crossPostAlbums?: string[];
  onUpdate?: (updatedPost: Post) => void;
  onExitComplete?: () => void;
}

export default function ImageModal({
  isOpen,
  onClose,
  image: rawImage = '',
  title,
  description,
  postId,
  onDelete,
  contentUrl,
  isAudio,
  slug,
  category,
  album,
  isText,
  postType,
  price,
  galleryUrls,
  canEdit = false,
  post,
  isActive,
  isFavorite: initialIsFavorite = false,
  crossPostAlbums,
  onUpdate,
  onExitComplete,
}: ImageModalProps) {
  const image = rawImage ?? '';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { token: authToken } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const previousScrollRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const normalizeCandidates = (...values: Array<string | null | undefined>) => {
    const unique = new Set<string>();
    for (const value of values) {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) {
        unique.add(trimmed);
      }
    }
    return Array.from(unique);
  };

  const mergedGallerySources = useMemo(() => {
    const candidates = [
      ...(galleryUrls ?? []),
      ...(post?.gallery_urls ?? []),
      image,
    ];
    return normalizeCandidates(...candidates);
  }, [galleryUrls, post?.gallery_urls, image]);

  const galleryImages =
    mergedGallerySources.length > 0 ? mergedGallerySources : normalizeCandidates(image);

  const displayedImage = galleryImages[activeImageIndex] || image;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [galleryImages, isOpen]);

  const formattedPrice = useMemo(() => {
    if (price === undefined || price === null) return null;
    try {
      const isWhole = Number.isInteger(price);
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: isWhole ? 0 : 2,
        maximumFractionDigits: isWhole ? 0 : 2,
      }).format(price);
    } catch {
      const isWhole = Number.isInteger(price);
      return isWhole ? price.toFixed(0) : price.toFixed(2);
    }
  }, [price]);

  const isProject = category === 'projects';
  // An embedded note is flagged by post_type, not category — it can live in
  // any subject now, so the category tells us nothing about how to render it.
  const isNote = postType === 'note';
  // The now-playing card is live and carries nothing of its own to show.
  const isNowPlaying = postType === 'now_playing';
  const isBio = category === 'bio' || isText;
  const isShop = category === 'apparel';
  const isArtOrPhoto = category === 'art' || category === 'photo';

  const trimmedDescription = description?.trim() ?? '';
  // Art and photo captions run to a line or two, so they sit beside the title
  // rather than alone in a half-width column of their own.
  const inlineDescription = isArtOrPhoto ? trimmedDescription : '';
  const panelDescription = isArtOrPhoto ? '' : trimmedDescription;

  // The details column only earns its half of the modal when it holds
  // something. An image post whose caption moved up to the title would
  // otherwise open with a blank panel sitting next to the image.
  const hasDetailsPanel = Boolean(panelDescription) || isShop;

  // The image is capped rather than stretched, so its box is exactly the
  // rendered picture and the modal ends at the bottom edge of the photo
  // instead of padding it out to the full viewport height. The reserve covers
  // the header and the column's own padding, plus anything sharing the column.
  const reservedHeightPx =
    128 +
    (galleryImages.length > 1 ? 88 : 0) +
    (isAudio && contentUrl ? 70 : 0);

  const isImageUrl = (value?: string | null) => {
    if (!value) return false;
    const sanitized = value.split('?')[0];
    return /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(sanitized);
  };

  const fullscreenImage = useMemo(() => {
    // If we are viewing the main image (index 0), try to find a high-res source first
    if (activeImageIndex === 0) {
      const highResCandidates = normalizeCandidates(
        post?.content_url,
        contentUrl,
        post?.splash_image_url
      );
      const highRes = highResCandidates.find(isImageUrl);
      if (highRes) return highRes;
    }

    const candidates = normalizeCandidates(
      mergedGallerySources[activeImageIndex],
      post?.gallery_urls?.[activeImageIndex],
      post?.splash_image_url,
      post?.content_url,
      contentUrl,
      rawImage,
      post?.thumbnail_url,
      image
    );

    return candidates.find(isImageUrl);
  }, [
    mergedGallerySources,
    activeImageIndex,
    post?.gallery_urls,
    post?.splash_image_url,
    post?.content_url,
    contentUrl,
    rawImage,
    post?.thumbnail_url,
    image
  ]);

  const articleContent = useMemo(() => {
    if (!(isProject || isBio) || !contentUrl) return '';
    return contentUrl;
  }, [isProject, isBio, contentUrl]);

  const normalizeLink = (href?: string) => {
    if (!href) return '#';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(href)) {
      return href;
    }
    return `https://${href.replace(/^\/+/, '')}`;
  };

  const markdownComponents = useMemo(() => ({
    a: ({ node, href, children, ...props }: any) => {
      const finalHref = normalizeLink(href);
      return (
        <a
          href={finalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/60 hover:text-white"
          {...props}
        >
          {children}
        </a>
      );
    },
  }), []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousScrollRef.current = window.scrollY;
      const bodyStyle = document.body.style;
      const htmlStyle = document.documentElement.style;
      const originalBodyOverflow = bodyStyle.overflow;
      const originalHtmlOverflow = htmlStyle.overflow;
      htmlStyle.overflow = 'hidden';
      bodyStyle.overflow = 'hidden';
      return () => {
        htmlStyle.overflow = originalHtmlOverflow;
        bodyStyle.overflow = originalBodyOverflow;
        window.scrollTo({ top: previousScrollRef.current, behavior: 'auto' });
      };
    }
  }, [isOpen]);

  const handleImageClick = () => {
    if (isAudio || (contentUrl && (category === 'projects' || category === 'bio')) || isText) {
      return;
    }
    if (!fullscreenImage) return;
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postId || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(postId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Error deleting post:', err);
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleToggleFavorite = async () => {
    if (!postId || !authToken || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const newStatus = !isFavorite;
      // Optimistic update
      setIsFavorite(newStatus);

      await updatePost(postId, { is_favorite: newStatus }, authToken);
      console.log('Favorite status updated:', newStatus);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setIsFavorite(!isFavorite);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto ${hasDetailsPanel ? 'max-w-6xl' : 'max-w-4xl'}`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-4 p-6 border-b border-white/20">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white">{title}</h2>
                  {inlineDescription && (
                    <p className="text-base font-light italic text-white/50 leading-snug">
                      {inlineDescription}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isActive && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full mr-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      <span className="text-xs font-medium text-green-400 tracking-wide uppercase">Active Project</span>
                    </div>
                  )}
                  {canEdit && postId && (
                    <button
                      onClick={handleToggleFavorite}
                      disabled={isTogglingFavorite}
                      className="w-10 h-10 flex items-center justify-center hover:bg-yellow-500/20 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50 group"
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${isFavorite
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-white group-hover:text-yellow-400"
                          }`}
                      />
                    </button>
                  )}
                  {canEdit && postId && onUpdate && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-blue-500/20 rounded-lg transition-colors backdrop-blur-sm group"
                      title="Edit post"
                    >
                      <Pencil className="w-5 h-5 text-white group-hover:text-blue-400 decoration-white" />
                    </button>
                  )}
                  {canEdit && postId && onDelete && (
                    <button
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
                      title="Delete post"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              {isNowPlaying ? (
                <div className="p-2 max-h-[calc(90vh-80px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <NowPlayingTile size="modal" />
                </div>
              ) : isProject || isBio ? (
                <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto border-t lg:border-t-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div>

                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap italic">{description}</p>
                    </div>

                    {articleContent && (
                      <div className="space-y-3">
                        {/\.pdf$/i.test(articleContent) ? (
                          <div className="w-full h-[600px] border border-white/20 rounded-lg overflow-hidden bg-white/5">
                            <iframe
                              src={articleContent}
                              className="w-full h-full"
                              title="Document Preview"
                            />
                          </div>
                        ) : /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(articleContent) ? (
                          <div
                            className="w-full rounded-lg overflow-hidden border border-white/20 cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setIsFullscreen(true)}
                          >
                            <img
                              src={articleContent}
                              alt="Content"
                              className="w-full h-auto"
                            />
                          </div>
                        ) : isNote ? (
                          // Note bodies are rich-text HTML from the w_notes
                          // editor, not markdown, so ReactMarkdown would render
                          // them as escaped tags. The markup was sanitized
                          // server-side by the ingest endpoint (nh3, strict tag
                          // allowlist), which is what makes this safe to inject.
                          <div
                            className="prose prose-invert font-sans prose-headings:font-sans prose-p:text-white/80"
                            dangerouslySetInnerHTML={{ __html: articleContent }}
                          />
                        ) : (
                          <div className="prose prose-invert font-sans prose-headings:font-sans prose-p:text-white/80">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {articleContent}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`flex flex-col max-h-[calc(90vh-80px)] ${hasDetailsPanel ? 'lg:flex-row' : ''}`}>
                  <div className={`p-6 space-y-4 ${hasDetailsPanel ? 'lg:w-1/2' : 'w-full'}`}>
                    {!(isProject || isBio) && displayedImage && (
                      <div className="relative cursor-pointer flex items-center justify-center" onClick={handleImageClick}>
                        <img
                          src={displayedImage}
                          alt={title}
                          style={{ '--image-max-h': `calc(90vh - ${reservedHeightPx}px)` } as React.CSSProperties}
                          className="w-full h-auto max-h-[60vh] object-contain rounded-xl transition-transform duration-300 hover:scale-102 lg:max-h-[var(--image-max-h)]"
                        />
                      </div>
                    )}
                    {galleryImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                        {galleryImages.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => setActiveImageIndex(index)}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg border ${index === activeImageIndex ? 'border-white' : 'border-white/20'
                              } overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors`}
                          >
                            <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {isAudio && contentUrl && (
                      <audio
                        controls
                        autoPlay
                        src={contentUrl}
                        className="w-full"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </div>

                  {hasDetailsPanel && (
                    <div className="lg:w-1/2 p-6 border-t lg:border-t-0 lg:border-l border-white/20 overflow-y-auto">
                      <div className="space-y-6">
                        {panelDescription && (
                          <p className="text-white/80 leading-relaxed whitespace-pre-wrap italic">{panelDescription}</p>
                        )}

                        {isShop && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold border border-white/20 shadow-md shadow-black/30 transition-all duration-200 w-full md:w-auto backdrop-blur-sm hover:border-white/50 hover:shadow-xl hover:bg-white/20"
                            aria-label="Buy item (coming soon)"
                          >
                            Buy
                            {formattedPrice && (
                              <span className="text-sm font-medium text-white/80">{formattedPrice}</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Confirmation Dialog */}
              {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-white mb-4">Delete Post?</h3>
                    <p className="text-white/80 mb-6">
                      Are you sure you want to delete "{title}"? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleDeleteCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fullscreen Image Overlay */}
          <AnimatePresence>
            {isFullscreen && !isProject && !isAudio && fullscreenImage && (
              <motion.div
                className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={handleCloseFullscreen}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={fullscreenImage}
                    alt={title}
                    className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] object-contain rounded-xl"
                  />
                  <motion.button
                    onClick={handleCloseFullscreen}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                  >
                    <X className="w-6 h-6 text-white" />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Edit Modal */}
          {postId && isEditModalOpen && (
            <EditPostModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              post={{
                id: postId,
                title,
                description,
                category: category || '',
                album: album || '',
                price,
                isActive,
                isMajor: post?.splash_image_url === post?.content_url && category !== 'bio', // inferred roughly
                contentUrl,
                thumbnailUrl: post?.thumbnail_url,
                slug,
                crossPostAlbums: crossPostAlbums || [],
              }}
              onUpdate={(updatedPost) => {
                if (onUpdate) onUpdate(updatedPost);
                // The parent (Feed) will update the state, which re-renders ImageModal
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
