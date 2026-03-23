import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  handleFirestoreError,
  OperationType
} from './firebase';
import { Profile, Transaction, User, translations, LanguageStrings } from './types';
import { BottomNav } from './components/BottomNav';
import { ProfileSelector } from './components/ProfileSelector';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { ProfileForm } from './components/ProfileForm';
import { ProfileShare } from './components/ProfileShare';
import { UsernameSetup } from './components/UsernameSetup';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Budgets } from './components/Budgets';
import { ReminderList } from './components/ReminderList';
import { ActivityLog } from './components/ActivityLog';
import ChatComponent from './components/Chat';
import { Login } from './components/Login';
import { VerifyEmail } from './components/VerifyEmail';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationCenter } from './components/NotificationCenter';
import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LockScreen } from './components/LockScreen';
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Share2, Users, Target, WifiOff } from 'lucide-react';
import { serverTimestamp, or } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingUser, setCheckingUser] = useState(true);
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [activeTab, setActiveTab] = useState('home');
  const [historyView, setHistoryView] = useState<'transactions' | 'activity'>('transactions');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showProfileBar, setShowProfileBar] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [filters, setFilters] = useState({ type: '', category: '', source: '' });
  const [isLocked, setIsLocked] = useState(!!localStorage.getItem('app_pin'));

  const t = translations[language];

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleVisibilityChange = () => {
      if (document.hidden && localStorage.getItem('app_pin')) {
        setIsLocked(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setCheckingUser(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        // We don't throw here to avoid breaking the app, but we log it
        try {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        } catch (e) {
          // Error already logged by handleFirestoreError
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user || !userData) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          // Only trigger for notifications created recently (not on initial load of old unread ones)
          const createdAt = notif.createdAt?.toDate?.() || new Date(notif.createdAt);
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            // Play sound
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play().catch(e => console.error('Error playing sound:', e));

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notif.title, { body: notif.message, icon: '/favicon.ico' });
            }
            
            // Show custom message
            setMessage(`${notif.title}: ${notif.message}`);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, userData]);

  useEffect(() => {
    if (!user || !userData) return;

    // Check for due reminders and notify
    const checkReminders = async () => {
      try {
        const q = query(
          collection(db, 'reminders'),
          where('ownerId', '==', user.uid),
          where('completed', '==', false)
        );
        const snapshot = await getDocs(q);
        const now = new Date();
        
        for (const docSnap of snapshot.docs) {
          const reminder = { id: docSnap.id, ...docSnap.data() } as any;
          const dueDate = reminder.dueDate?.toDate?.() || new Date(reminder.dueDate);
          
          // If due within next 24 hours and not already notified
          if (dueDate > now && dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
            // Check if we already sent a notification for this reminder today
            const notifQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', user.uid),
              where('relatedId', '==', reminder.id),
              where('type', '==', 'REMINDER')
            );
            const notifSnapshot = await getDocs(notifQuery);
            
            if (notifSnapshot.empty) {
              await createNotification(
                user.uid,
                'Upcoming Reminder',
                `Reminder: ${reminder.title} is due at ${dueDate.toLocaleString()}`,
                'REMINDER',
                reminder.id
              );
            }
          }
        }
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [user, userData]);

  useEffect(() => {
    if (!user || !userData) return;

    const q = query(
      collection(db, 'profiles'),
      or(
        where('ownerId', '==', user.uid),
        where('members', 'array-contains', user.uid)
      ),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const profileData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Profile));
      setProfiles(profileData);
      if (profileData.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profileData[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    });

    return () => unsubscribe();
  }, [user, userData]);

  useEffect(() => {
    if (!user || !userData || !selectedProfileId) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('profileId', '==', selectedProfileId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Transaction));
      setTransactions(txData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user, userData, selectedProfileId]);

  const handleAddProfile = async (name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'profiles'), {
        name,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowProfileForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'profiles');
    }
  };

  const logAudit = async (profileId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', details: string, transactionType?: 'IN' | 'OUT', amount?: number) => {
    if (!user || !userData) return;
    try {
      const logData: any = {
        profileId,
        userId: user.uid,
        userName: userData.displayName || userData.username,
        action,
        details,
        timestamp: serverTimestamp()
      };
      if (transactionType) logData.transactionType = transactionType;
      if (amount !== undefined) logData.amount = amount;

      await addDoc(collection(db, 'audit_logs'), logData);
      
      // Notify other members
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        const membersToNotify = [profile.ownerId, ...(profile.members || [])].filter(id => id !== user.uid);
        for (const memberId of membersToNotify) {
          await createNotification(
            memberId,
            `Transaction ${action === 'CREATE' ? 'Added' : action === 'UPDATE' ? 'Updated' : 'Deleted'}`,
            `${userData.displayName || userData.username} ${action === 'CREATE' ? 'added' : action === 'UPDATE' ? 'updated' : 'deleted'} a ${transactionType} transaction of ${amount?.toLocaleString()} ETB in ${profile.name}`,
            'TRANSACTION',
            profileId
          );
        }
      }
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  };

  const createNotification = async (userId: string, title: string, message: string, type: 'TRANSACTION' | 'REMINDER' | 'SYSTEM', relatedId?: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        relatedId
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  const handleAddTransaction = async (data: any) => {
    if (!user || !selectedProfileId) {
      setMessage('Please select or create a profile first.');
      return;
    }
    try {
      await addDoc(collection(db, 'transactions'), {
        ...data,
        profileId: selectedProfileId,
        ownerId: user.uid,
        date: data.date ? new Date(data.date) : new Date()
      });
      await logAudit(selectedProfileId, 'CREATE', `Added transaction (${data.category})`, data.type, data.amount);
      setShowTxForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleUpdateTransaction = async (id: string, data: any) => {
    try {
      const txToUpdate = transactions.find(t => t.id === id);
      await updateDoc(doc(db, 'transactions', id), {
        ...data,
        date: data.date ? new Date(data.date) : new Date()
      });
      if (txToUpdate) {
        await logAudit(txToUpdate.profileId, 'UPDATE', `Updated transaction (${data.category})`, data.type, data.amount);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const txToDelete = transactions.find(t => t.id === id);
      await deleteDoc(doc(db, 'transactions', id));
      if (txToDelete) {
        await logAudit(txToDelete.profileId, 'DELETE', `Deleted transaction (${txToDelete.category})`, txToDelete.type, txToDelete.amount);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  const handleUpdateProfile = async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, 'profiles', id), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'profiles');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'profiles', id));
      if (selectedProfileId === id) {
        setSelectedProfileId(profiles.length > 1 ? profiles.filter(p => p.id !== id)[0].id : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'profiles');
    }
  };

  if (loading || checkingUser) {
    return <LoadingSpinner fullScreen message="Loading Ethiopian Cash Book..." />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (!user) {
    return <Login onSuccess={setUser} />;
  }

  const isEmailUser = user.providerData.some((p: any) => p.providerId === 'password');
  if (isEmailUser && !user.emailVerified) {
    return <VerifyEmail user={user} t={t} />;
  }

  if (!userData) {
    return <UsernameSetup user={user} onComplete={setUserData} t={t} />;
  }

  const handleUpdateUser = (data: Partial<User>) => {
    if (userData) {
      setUserData({ ...userData, ...data });
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isOwner = selectedProfile?.ownerId === user.uid;

  const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIn - totalOut;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-black to-yellow-950/30 pb-20">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-md px-6 pt-4 pb-2 rounded-b-[2rem] shadow-sm border-b border-gray-800 sticky top-0 z-40">
          {isOffline && (
            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 flex items-center justify-center space-x-2 rounded-t-[2rem]">
              <WifiOff size={12} />
              <span>Offline Mode - Changes will sync when online</span>
            </div>
          )}
          <div className={cn("flex justify-between items-center mb-6", isOffline && "mt-4")}>
            <div className="flex items-center space-x-3">
              {userData.photoURL ? (
                <img 
                  src={userData.photoURL} 
                  alt={userData.displayName || userData.username} 
                  className="w-10 h-10 rounded-xl object-cover border-2 border-yellow-400"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-black">
                  {userData.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  {userData.displayName || userData.username}
                </h1>
                <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">@{userData.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {selectedProfile && (
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="bg-gray-800 p-1.5 rounded-full text-yellow-400 hover:bg-gray-700 transition-colors"
                  title="Share Profile"
                >
                  <Share2 size={14} />
                </button>
              )}
              <button 
                onClick={() => setShowProfileBar(!showProfileBar)}
                className="bg-gray-800 p-1.5 rounded-full text-yellow-400"
              >
                {showProfileBar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button 
                onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
                className="bg-yellow-400 px-2 py-0.5 rounded-full text-[10px] font-bold text-black"
              >
                {language === 'en' ? 'አማርኛ' : 'EN'}
              </button>
              <NotificationCenter userId={user.uid} t={t} />
            </div>
          </div>

          {showProfileBar && (
            <ProfileSelector 
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              onSelect={setSelectedProfileId}
              onAdd={() => setShowProfileForm(true)}
              onEdit={setEditingProfile}
              onDelete={handleDeleteProfile}
              t={t}
              currentUserId={user.uid}
            />
          )}
        </header>

        <UserProfileModal 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
          t={t}
          onStartChat={(u) => {
            setSelectedUserId(null);
            setActiveTab('chat');
          }}
        />

        <main className="p-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-black to-yellow-900 rounded-3xl p-6 text-white shadow-xl shadow-yellow-900/20">
                <p className="text-yellow-100 text-sm font-medium mb-1">{t.balance}</p>
                <h2 className="text-4xl font-black mb-6">{balance.toLocaleString()} <span className="text-xl">ETB</span></h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <div className="flex items-center space-x-2 text-green-400 mb-1">
                      <TrendingUp size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t.cashIn}</span>
                    </div>
                    <p className="font-bold text-lg">{totalIn.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <div className="flex items-center space-x-2 text-red-400 mb-1">
                      <TrendingDown size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t.cashOut}</span>
                    </div>
                    <p className="font-bold text-lg">{totalOut.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2.5rem] border border-gray-800/50 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">{t.history}</h3>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-yellow-400 text-sm font-bold"
                  >
                    View All
                  </button>
                </div>
                <TransactionList 
                  transactions={transactions.slice(0, 5)} 
                  t={t} 
                  filters={filters} 
                  setFilters={setFilters} 
                  onEdit={setEditingTransaction}
                  onDelete={handleDeleteTransaction}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{t.history}</h3>
                <div className="flex space-x-2 bg-gray-900 p-1 rounded-xl">
                  <button
                    onClick={() => setHistoryView('transactions')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      historyView === 'transactions' ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
                    )}
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => setHistoryView('activity')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      historyView === 'activity' ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
                    )}
                  >
                    Activity Log
                  </button>
                </div>
              </div>

              {historyView === 'transactions' ? (
                <TransactionList 
                  transactions={transactions} 
                  t={t} 
                  filters={filters} 
                  setFilters={setFilters} 
                  onEdit={setEditingTransaction}
                  onDelete={handleDeleteTransaction}
                />
              ) : (
                selectedProfileId && (
                  <ActivityLog 
                    profileId={selectedProfileId} 
                    t={t} 
                    onUserClick={setSelectedUserId}
                  />
                )
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <Reports transactions={transactions} t={t} />
          )}

          {activeTab === 'budgets' && (
            selectedProfile && userData ? <Budgets selectedProfile={selectedProfile} currentUser={user} t={t} /> : null
          )}

          {activeTab === 'reminders' && (
            <ReminderList currentUser={user} t={t} />
          )}

          {activeTab === 'chat' && userData && (
            <ChatComponent t={t} user={userData} />
          )}

          {activeTab === 'settings' && (
            userData ? (
              <Settings 
                language={language} 
                setLanguage={setLanguage} 
                t={t} 
                userData={userData} 
                onUpdateUser={handleUpdateUser}
                profiles={profiles}
                onManageTeam={(profile) => {
                  setSelectedProfileId(profile.id);
                  setShowShareModal(true);
                }}
              />
            ) : null
          )}
        </main>

        {/* FAB */}
        {activeTab === 'home' && (
          <button
            onClick={() => setShowTxForm(true)}
            className="fixed right-6 bottom-24 w-14 h-14 bg-yellow-400 text-black rounded-2xl shadow-xl shadow-yellow-400/20 flex items-center justify-center hover:bg-yellow-500 transition-all active:scale-95 z-20"
          >
            <Plus size={32} />
          </button>
        )}

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} t={t} />

        {message && (
          <div className="fixed top-6 left-6 right-6 bg-yellow-400 text-black p-4 rounded-xl shadow-lg z-50 animate-in slide-in-from-top duration-300">
            {message}
          </div>
        )}

        {showTxForm && (
          <TransactionForm 
            onSubmit={handleAddTransaction}
            onClose={() => setShowTxForm(false)}
            t={t}
          />
        )}

        {editingTransaction && (
          <TransactionForm 
            onSubmit={(data) => {
              handleUpdateTransaction(editingTransaction.id, data);
              setEditingTransaction(null);
            }}
            onClose={() => setEditingTransaction(null)}
            t={t}
            initialData={editingTransaction}
          />
        )}

        {showProfileForm && (
          <ProfileForm 
            onSubmit={handleAddProfile}
            onClose={() => setShowProfileForm(false)}
            t={t}
          />
        )}

        {editingProfile && (
          <ProfileForm 
            onSubmit={(name) => {
              handleUpdateProfile(editingProfile.id, name);
              setEditingProfile(null);
            }}
            onClose={() => setEditingProfile(null)}
            t={t}
            initialData={editingProfile}
          />
        )}

        <AnimatePresence>
          {showShareModal && selectedProfile && (
            <ProfileShare 
              profile={selectedProfile}
              currentUser={user}
              onClose={() => setShowShareModal(false)}
              t={t}
              onUserClick={setSelectedUserId}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
