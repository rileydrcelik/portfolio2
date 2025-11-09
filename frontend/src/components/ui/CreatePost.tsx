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
          <div className="fixed bottom-6 right-6 z-50">
            <motion.button
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-white backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <PlusIcon className="w-6 h-6" />
            </motion.button>
          </div>
        </>
      ) : (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.button
            className="px-5 py-2 rounded-2xl text-white font-semibold border border-white/25 shadow-lg backdrop-blur-sm"
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
