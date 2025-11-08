'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  title: string;
  description: string;
  date?: string;
  tags?: string[];
  postId?: string;
  onDelete?: (postId: string) => void;
  contentUrl?: string;
  isAudio?: boolean;
  slug?: string;
  category?: string;
  album?: string;
  isText?: boolean;
}

export default function ImageModal({
  isOpen,
  onClose,
  image,
  title,
  description,
  date,
  tags,
  postId,
  onDelete,
  contentUrl,
  isAudio,
  slug,
  category,
  album,
  isText,
}: ImageModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const previousScrollRef = useRef(0);
  const [mounted, setMounted] = useState(false);

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

  const isProject = category === 'projects';
  const isBio = category === 'bio' || isText;

  const articleContent = useMemo(() => {
    if (!(isProject || isBio) || !contentUrl) return '';
    return contentUrl;
  }, [isProject, isBio, contentUrl]);

  const normalizeLink = (href?: string) => {
    if (!href) return '#';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(href)) {
      return href;
    }
    return `https://${href.replace(/^\/+/,'')}`;
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
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
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <div className="flex items-center gap-2">
                  {postId && onDelete && (
                    <button
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
                      title="Delete post"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              {isProject || isBio ? (
                <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto border-t lg:border-t-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{description}</p>
                    </div>

                    {articleContent && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">{isProject ? 'Project Article' : 'Bio Entry'}</h3>
                        <div className="prose prose-invert prose-headings:font-serif prose-p:text-white/80">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {articleContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {tags && tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 bg-white/20 border border-white/30 rounded-full text-sm text-white"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Technical Details</h3>
                      <div className="space-y-2 text-white/80">
                        {date && (
                          <p>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
                  <div className="lg:w-1/2 p-6 space-y-4">
                    {!(isProject || isBio) && (
                      <div className="relative cursor-pointer" onClick={handleImageClick}>
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-auto max-h-[60vh] object-contain rounded-xl transition-transform duration-300 hover:scale-102"
                        />
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

                  <div className="lg:w-1/2 p-6 border-t lg:border-t-0 lg:border-l border-white/20 overflow-y-auto">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{description}</p>
                      </div>

                      {tags && tags.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-3 py-1 bg-white/20 border border-white/30 rounded-full text-sm text-white"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Technical Details</h3>
                        <div className="space-y-2 text-white/80">
                          {date && (
                            <p>
                              <span className="font-medium">Created:</span>{' '}
                              {new Date(date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
            {isFullscreen && !isProject && !isAudio && (
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
                    src={contentUrl || image}
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
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
