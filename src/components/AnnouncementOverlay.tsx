import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

interface Announcement {
  id: string;
  message: string;
  createdAt: any;
}

export const AnnouncementOverlay: React.FC<{ userId: string }> = ({ userId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      where('userId', 'in', [userId, 'broadcast']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Announcement;
          // Check if announcement is recent (e.g., within 30s)
          const now = new Date().getTime();
          const createdAt = data.createdAt.toDate().getTime();
          if (now - createdAt < 30000) {
            setAnnouncements(prev => [...prev, { id: docSnap.id, ...data }]);
            // Auto remove after 30s
            setTimeout(() => {
                setAnnouncements(prev => prev.filter(a => a.id !== docSnap.id));
            }, 30000);
          }
      });
    });

    return () => unsub();
  }, [userId]);

  return (
    <AnimatePresence>
      {announcements.map((ann) => (
        <motion.div
          key={ann.id}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[5000] bg-white text-black px-8 py-4 rounded-xl shadow-2xl font-black text-center border-4 border-yellow-400"
        >
          <div className="text-sm text-yellow-600 mb-1 uppercase tracking-widest">🚨 ANUNCIO OFICIAL 🚨</div>
          <div className="text-xl uppercase tracking-tighter italic">{ann.message}</div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};
