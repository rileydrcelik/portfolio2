'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  title: string;
  description: string;
}

export default function ImageModal({ isOpen, onClose, image, title, description }: ImageModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleImageClick = () => {
    setIsFullscreen(true);
  };
  
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };
  
  return (
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
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
                {/* Image Section */}
                <div className="lg:w-1/2 p-6">
                  <div className="relative cursor-pointer" onClick={handleImageClick}>
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-auto max-h-[60vh] object-contain rounded-xl transition-transform duration-300 hover:scale-102"
                    />
                  </div>
                </div>
                
                {/* Text Section */}
                <div className="lg:w-1/2 p-6 border-t lg:border-t-0 lg:border-l border-white/20">
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-white/80 leading-relaxed">{description}</p>
                    </div>
                    
                    {/* Lorem Ipsum Content */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">About This Work</h3>
                      <p className="text-white/80 leading-relaxed mb-4">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                        incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
                        exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                      <p className="text-white/80 leading-relaxed mb-4">
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
                        fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
                        culpa qui officia deserunt mollit anim id est laborum.
                      </p>
                      <p className="text-white/80 leading-relaxed">
                        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
                        doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
                        veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                      </p>
                    </div>
                    
                    {/* Technical Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Technical Details</h3>
                      <div className="space-y-2 text-white/80">
                        <p><span className="font-medium">Medium:</span> Digital Art</p>
                        <p><span className="font-medium">Dimensions:</span> 1920 x 1080px</p>
                        <p><span className="font-medium">Created:</span> 2024</p>
                        <p><span className="font-medium">Category:</span> {title.includes('Art') ? 'Artwork' : 'Photography'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Fullscreen Image Overlay */}
          <AnimatePresence>
            {isFullscreen && (
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
                    src={image}
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
    </AnimatePresence>
  );
}