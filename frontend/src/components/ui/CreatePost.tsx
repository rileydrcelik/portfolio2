'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import PostModal from './PostModal';
import { useAuth } from '@/providers/AuthProvider';

export default function CreatePost() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return null;
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('[Auth] Sign-in failed:', err);
    }
  };

  return (
    <>
      {user ? (
        <>
          <div className="fixed top-4 right-4 md:top-auto md:bottom-6 md:right-6 z-50">
            <motion.button
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg text-white backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <PlusIcon className="w-5 h-5 md:w-6 md:h-6" />
            </motion.button>
          </div>
        </>
      ) : (
        <div className="fixed top-4 right-4 md:top-auto md:bottom-6 md:right-6 z-50">
          <motion.button
            className="px-3 py-1.5 md:px-5 md:py-2 text-sm md:text-base rounded-xl md:rounded-2xl text-white font-semibold border border-white/25 shadow-lg backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignIn}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            Admin Sign In
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <PostModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
