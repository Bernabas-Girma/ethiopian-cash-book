import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LanguageStrings } from '../types';
import { X, Mail, Phone, User as UserIcon, Calendar, Shield, MessageCircle, Loader2 } from 'lucide-react';
import { db, doc, getDoc } from '../firebase';
import { cn } from '../lib/utils';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  t: LanguageStrings;
  onStartChat?: (user: User) => void;
}

export function UserProfileModal({ userId, onClose, t, onStartChat }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } catch (err) {
        console.error('Error fetching user for modal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (!userId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="text-yellow-400 animate-spin" size={48} />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
            </div>
          ) : user ? (
            <>
              {/* Header/Cover */}
              <div className="h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Info */}
              <div className="px-6 pb-8 -mt-12 relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-gray-900 rounded-[2rem] p-1 mb-4 shadow-xl">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.username}
                        className="w-full h-full object-cover rounded-[1.8rem]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-yellow-400 rounded-[1.8rem] flex items-center justify-center text-black text-3xl font-black">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {user.displayName || user.username}
                  </h2>
                  <p className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-6">
                    @{user.username}
                  </p>

                  <div className="w-full space-y-3 mb-8">
                    {user.email && !user.hideEmail && (
                      <div className="flex items-center space-x-3 bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                        <div className="bg-yellow-400/10 p-2 rounded-xl text-yellow-400">
                          <Mail size={18} />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email</p>
                          <p className="text-sm text-white truncate">{user.email}</p>
                        </div>
                      </div>
                    )}

                    {user.phoneNumber && (
                      <div className="flex items-center space-x-3 bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                        <div className="bg-yellow-400/10 p-2 rounded-xl text-yellow-400">
                          <Phone size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Phone</p>
                          <p className="text-sm text-white">{user.phoneNumber}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3 bg-black/40 p-4 rounded-2xl border border-gray-800/50">
                      <div className="bg-yellow-400/10 p-2 rounded-xl text-yellow-400">
                        <Shield size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Privacy</p>
                        <p className="text-sm text-white">
                          {user.messagePrivacy === 'friends' ? 'Friends Only' : user.messagePrivacy === 'none' ? 'Private' : 'Public'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(user)}
                      className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl shadow-yellow-400/20 flex items-center justify-center space-x-2 hover:bg-yellow-500 transition-all active:scale-95"
                    >
                      <MessageCircle size={20} />
                      <span>Send Message</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 italic">
              User not found
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

