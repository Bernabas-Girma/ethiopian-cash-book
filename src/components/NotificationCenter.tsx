import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  db 
} from '../firebase';
import { Notification, LanguageStrings } from '../types';
import { Bell, BellOff, Check, Trash2, X, Info, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NotificationCenterProps {
  userId: string;
  t: LanguageStrings;
}

export function NotificationCenter({ userId, t }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TRANSACTION':
        return <TrendingUp size={16} className="text-yellow-400" />;
      case 'REMINDER':
        return <Calendar size={16} className="text-blue-400" />;
      default:
        return <Info size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-full bg-gray-800 text-yellow-400 hover:bg-gray-700 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
                <h3 className="font-bold text-white">{t.notifications}</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest hover:text-yellow-300"
                  >
                    {t.markAllRead}
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <BellOff size={32} className="mx-auto text-gray-700" />
                    <p className="text-sm text-gray-500">{t.noNotifications}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={cn(
                          "p-4 transition-colors group relative",
                          !n.read ? "bg-yellow-400/5" : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex space-x-3">
                          <div className="mt-1">{getIcon(n.type)}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <p className={cn("text-xs font-bold", !n.read ? "text-yellow-400" : "text-gray-300")}>
                                {n.title}
                              </p>
                              <button 
                                onClick={() => deleteNotification(n.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-600">
                              {new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="absolute right-4 bottom-4 p-1 rounded-full bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all"
                          >
                            <Check size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
