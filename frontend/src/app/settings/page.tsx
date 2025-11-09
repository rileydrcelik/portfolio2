'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';

export default function SettingsPage() {
  const { user, loading, signOut, signInWithGoogle } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[Auth] Sign-out failed:', err);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('[Auth] Sign-in failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Settings</h1>
          <p className="text-white/60 mt-2">Manage your admin session.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          {loading ? (
            <p className="text-white/60">Checking authentication…</p>
          ) : user ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-wide text-white/50">Signed in as</p>
                <p className="text-lg font-semibold text-white">{user.email ?? 'Admin user'}</p>
              </div>

              <motion.button
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl text-white font-semibold border border-white/25 shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
                whileHover={{ scale: 1.05, opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignOut}
              >
                Sign out
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/70">You&apos;re not signed in. Use your admin Google account to manage posts.</p>
              <motion.button
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl text-white font-semibold border border-white/25 shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.175)' }}
                whileHover={{ scale: 1.05, opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignIn}
              >
                Sign in with Google
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
