import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db, collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove, getDoc } from '../firebase';
import { Profile, User, ProfileRole, LanguageStrings } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { X, Search, UserPlus, UserMinus, Loader2, Users, Heart, CheckCircle } from 'lucide-react';

interface ProfileShareProps {
  profile: Profile;
  currentUser: any;
  onClose: () => void;
  t: LanguageStrings;
  onUserClick?: (userId: string) => void;
}

export function ProfileShare({ profile, currentUser, onClose, t, onUserClick }: ProfileShareProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!profile.members || profile.members.length === 0) {
        setMembers([]);
        setMembersLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'users'), where('uid', 'in', profile.members));
        const querySnapshot = await getDocs(q);
        const memberData = querySnapshot.docs.map(doc => doc.data() as User);
        setMembers(memberData);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [profile.members]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data() as User;
        
        if (userData.friends && userData.friends.length > 0) {
          const q = query(collection(db, 'users'), where('uid', 'in', userData.friends));
          const querySnapshot = await getDocs(q);
          const friendsData = querySnapshot.docs.map(doc => doc.data() as User);
          setFriends(friendsData);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
      } finally {
        setFriendsLoading(false);
      }
    };

    fetchFriends();
  }, [currentUser.uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length < 3) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs
        .map(doc => doc.data() as User)
        .filter(u => u.uid !== currentUser.uid && !profile.members?.includes(u.uid));
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (user: User) => {
    try {
      // Optimistic UI update
      setMembers(prev => [...prev, user]);
      setSearchResults(prev => prev.filter(u => u.uid !== user.uid));
      
      if (!friends.some(f => f.uid === user.uid)) {
        setFriends(prev => [...prev, user]);
      }

      // Add to profile members
      await updateDoc(doc(db, 'profiles', profile.id), {
        members: arrayUnion(user.uid)
      });
      
      // Add to current user's friends list
      await updateDoc(doc(db, 'users', currentUser.uid), {
        friends: arrayUnion(user.uid)
      });

      setNotification(`Added @${user.username} to the team!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error adding member:', err);
      // Rollback on error
      setMembers(prev => prev.filter(u => u.uid !== user.uid));
      setNotification('Failed to add member. Please try again.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const removeMember = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'profiles', profile.id), {
        members: arrayRemove(uid)
      });
      setMembers(members.filter(u => u.uid !== uid));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const removeFriend = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        friends: arrayRemove(uid)
      });
      setFriends(friends.filter(f => f.uid !== uid));
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const updateRole = async (uid: string, role: ProfileRole) => {
    try {
      await updateDoc(doc(db, 'profiles', profile.id), {
        [`roles.${uid}`]: role
      });
      // Local update is handled by the onSnapshot in App.tsx if we use it, 
      // but here we might need a local refresh if we're not using real-time for members list
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-400/20 p-2 rounded-xl">
              <Users className="text-yellow-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t.team}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{profile.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-yellow-400 text-black px-4 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg"
          >
            <CheckCircle size={18} />
            <span className="text-sm">{notification}</span>
          </motion.div>
        )}

        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full bg-black border border-gray-800 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 animate-spin" size={20} />}
        </form>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.uid} className="bg-black p-3 rounded-2xl flex items-center justify-between border border-gray-800">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onUserClick?.(user.uid)}
                    >
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">@{user.username}</p>
                        <p className="text-xs text-gray-500">{user.displayName || user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addMember(user)}
                      className="bg-yellow-400 p-2 rounded-xl text-black hover:bg-yellow-500 transition-colors"
                    >
                      <UserPlus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friends.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Friends</h3>
              <div className="space-y-2">
                {friends.map(user => (
                  <div key={user.uid} className="bg-black/30 p-3 rounded-2xl flex items-center justify-between border border-gray-800/50">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onUserClick?.(user.uid)}
                    >
                      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-yellow-400 font-black">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">@{user.username}</p>
                        <p className="text-xs text-gray-500">{user.displayName || user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!profile.members?.includes(user.uid) && (
                        <button
                          onClick={() => addMember(user)}
                          className="bg-yellow-400/10 p-2 rounded-xl text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => removeFriend(user.uid)}
                        className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                        title="Remove from friends"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Members & Roles</h3>
            {membersLoading ? (
              <div className="py-4">
                <LoadingSpinner message="Loading members..." size={24} />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No members yet. Share with friends!</p>
            ) : (
              <div className="space-y-2">
                {members.map(user => (
                  <div key={user.uid} className="bg-black/50 p-3 rounded-2xl flex flex-col space-y-3 border border-gray-800">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onUserClick?.(user.uid)}
                      >
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-yellow-400 font-black">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">@{user.username}</p>
                          <p className="text-xs text-gray-500">{user.displayName || user.email}</p>
                        </div>
                      </div>
                      {profile.ownerId === currentUser.uid && user.uid !== currentUser.uid && (
                        <button
                          onClick={() => removeMember(user.uid)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <UserMinus size={20} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</span>
                      {profile.ownerId === currentUser.uid && user.uid !== currentUser.uid ? (
                        <select
                          value={profile.roles?.[user.uid] || 'editor'}
                          onChange={(e) => updateRole(user.uid, e.target.value as ProfileRole)}
                          className="bg-black border border-gray-800 rounded-lg px-2 py-1 text-xs text-yellow-400 outline-none focus:ring-1 focus:ring-yellow-400"
                        >
                          <option value="editor">{t.roles.editor}</option>
                          <option value="viewer">{t.roles.viewer}</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-yellow-400">
                          {user.uid === profile.ownerId ? t.roles.owner : (t.roles[profile.roles?.[user.uid] || 'editor'])}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
