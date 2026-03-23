import React, { useState } from 'react';
import { db, setDoc, doc, getDoc, collection, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { User, LanguageStrings } from '../types';
import { Wallet, Loader2 } from 'lucide-react';

interface UsernameSetupProps {
  user: any;
  onComplete: (userData: User) => void;
  t: LanguageStrings;
}

export function UsernameSetup({ user, onComplete, t }: UsernameSetupProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if username is taken
      const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('Username is already taken');
        setLoading(false);
        return;
      }

      const userData: User = {
        uid: user.uid,
        username: username.toLowerCase(),
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        friends: []
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      onComplete(userData);
    } catch (err: any) {
      console.error('Error setting username:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      } catch (e) {
        // Error already logged
      }
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-yellow-400/20 p-4 rounded-3xl inline-block mb-4">
            <Wallet size={48} className="text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Choose a Username</h2>
          <p className="text-gray-400 mt-2">This is how your friends will find you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe"
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              disabled={loading}
            />
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !username}
            className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl shadow-xl hover:bg-yellow-500 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <span>Get Started</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
