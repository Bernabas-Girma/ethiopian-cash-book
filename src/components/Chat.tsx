import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Lock, Shield, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { 
  db, 
  auth, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  getDocs
} from '../firebase';
import { Chat, Message, User as UserType, LanguageStrings, UserKeys } from '../types';
import { EncryptionService } from '../services/encryptionService';
import { LoadingSpinner } from './LoadingSpinner';

interface ChatProps {
  t: LanguageStrings;
  user: UserType;
}

export default function ChatComponent({ t, user }: ChatProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<(Message & { decryptedContent?: string })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keysReady, setKeysReady] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<JsonWebKey | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<JsonWebKey | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserType>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Encryption Keys
  useEffect(() => {
    let unsubMyKey: (() => void) | undefined;

    const initKeys = async () => {
      if (!auth.currentUser) return;
      
      const uid = auth.currentUser.uid;
      let privateKey = EncryptionService.getPrivateKey(uid);
      
      if (!privateKey) {
        // Check if public key exists in Firestore
        const keyDoc = await getDoc(doc(db, 'userKeys', uid));
        if (!keyDoc.exists()) {
          // Generate new keys
          const { publicKey, privateKey: newPrivKey } = await EncryptionService.generateKeyPair();
          await setDoc(doc(db, 'userKeys', uid), {
            uid,
            publicKey: JSON.stringify(publicKey),
            createdAt: serverTimestamp()
          });
          EncryptionService.storePrivateKey(uid, newPrivKey);
        } else {
          // Public key exists but private key is missing (e.g., new device)
          // In a real app, we'd ask for a backup phrase or similar.
          // For this demo, we'll just show a warning or regenerate (which breaks old messages).
          console.warn("Private key missing. Old messages won't be readable.");
          // For simplicity in this demo, let's regenerate if missing from local storage
          const { publicKey, privateKey: newPrivKey } = await EncryptionService.generateKeyPair();
          await setDoc(doc(db, 'userKeys', uid), {
            uid,
            publicKey: JSON.stringify(publicKey),
            createdAt: serverTimestamp()
          });
          EncryptionService.storePrivateKey(uid, newPrivKey);
        }
      }
      setKeysReady(true);
      
      // Listen to my public key changes
      unsubMyKey = onSnapshot(doc(db, 'userKeys', uid), (docSnap) => {
        if (docSnap.exists()) {
          setMyPublicKey(JSON.parse(docSnap.data().publicKey));
        }
      });
    };

    initKeys();

    return () => {
      if (unsubMyKey) unsubMyKey();
    };
  }, []);

  // 2. Fetch Chats
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Chat));
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChat || !auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Message));
      
      // Decrypt messages
      const uid = auth.currentUser!.uid;
      const privateKey = EncryptionService.getPrivateKey(uid);
      
      if (privateKey) {
        const decryptedMsgs = await Promise.all(msgList.map(async (msg) => {
          const isMe = msg.senderId === uid;
          const encryptedKeyToUse = isMe ? msg.senderEncryptedKey : msg.recipientEncryptedKey;
          
          if (encryptedKeyToUse) {
            const decrypted = await EncryptionService.decryptMessage(
              msg.encryptedContent,
              encryptedKeyToUse,
              msg.iv,
              privateKey
            );
            return { ...msg, decryptedContent: decrypted };
          } else {
            return { ...msg, decryptedContent: "[Encrypted]" }; 
          }
        }));
        setMessages(decryptedMsgs);
      } else {
        setMessages(msgList.map(m => ({ ...m, decryptedContent: "[Keys Missing]" })));
      }
      
      scrollToBottom();
    });

    // Fetch recipient public key
    const recipientId = activeChat.participants.find(p => p !== auth.currentUser!.uid);
    let unsubRecipientKey: (() => void) | undefined;
    
    if (recipientId) {
      unsubRecipientKey = onSnapshot(doc(db, 'userKeys', recipientId), (docSnap) => {
        if (docSnap.exists()) {
          setRecipientPublicKey(JSON.parse(docSnap.data().publicKey));
        }
      });
    }

    return () => {
      unsubscribe();
      if (unsubRecipientKey) unsubRecipientKey();
    };
  }, [activeChat]);

  // 4. Search Users
  useEffect(() => {
    if (!auth.currentUser || !showNewChat) return;

    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', searchQuery.toLowerCase()),
          where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserType))
          .filter(u => u.uid !== auth.currentUser?.uid); // Exclude self
        
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, showNewChat]);

  // 5. Fetch Profiles for Chats
  useEffect(() => {
    if (!auth.currentUser || chats.length === 0) return;

    const fetchProfiles = async () => {
      const newProfiles = { ...userProfiles };
      let updated = false;

      for (const chat of chats) {
        const otherId = chat.participants.find(p => p !== auth.currentUser?.uid);
        if (otherId && !newProfiles[otherId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherId));
            if (userDoc.exists()) {
              newProfiles[otherId] = { uid: userDoc.id, ...userDoc.data() } as UserType;
              updated = true;
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        }
      }

      if (updated) {
        setUserProfiles(newProfiles);
      }
    };

    fetchProfiles();
  }, [chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !auth.currentUser || !recipientPublicKey || !myPublicKey) return;

    setSending(true);
    try {
      const recipientId = activeChat.participants.find(p => p !== auth.currentUser!.uid)!;
      
      // 1. Encrypt message content with a new AES key
      const { encryptedContent, iv, aesKey } = await EncryptionService.encryptContent(newMessage);

      // 2. Encrypt the AES key for the recipient
      const recipientEncryptedKey = await EncryptionService.encryptSymmetricKey(aesKey, recipientPublicKey);

      // 3. Encrypt the AES key for the sender (myself)
      const senderEncryptedKey = await EncryptionService.encryptSymmetricKey(aesKey, myPublicKey);

      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        senderId: auth.currentUser.uid,
        recipientId,
        encryptedContent,
        recipientEncryptedKey,
        senderEncryptedKey,
        iv,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: "Encrypted Message",
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = async (targetUser: UserType) => {
    if (!auth.currentUser) return;

    // Check privacy settings
    const privacy = targetUser.messagePrivacy || 'everyone';
    if (privacy === 'none') {
      alert(`${targetUser.username} is not accepting messages right now.`);
      return;
    }
    
    if (privacy === 'friends') {
      const isFriend = targetUser.friends?.includes(auth.currentUser.uid);
      if (!isFriend) {
        alert(`${targetUser.username} only accepts messages from friends.`);
        return;
      }
    }

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(targetUser.uid));
    if (existingChat) {
      setActiveChat(existingChat);
      setShowNewChat(false);
      return;
    }

    // Create new chat
    const chatData = {
      participants: [auth.currentUser.uid, targetUser.uid],
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    setActiveChat({ id: docRef.id, ...chatData } as Chat);
    setShowNewChat(false);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading chats..." />;
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {activeChat && (
            <button 
              onClick={() => setActiveChat(null)}
              className="p-1.5 hover:bg-white/5 rounded-full transition-colors lg:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            {activeChat ? (
              (() => {
                const otherId = activeChat.participants.find(p => p !== auth.currentUser?.uid);
                const otherUser = otherId ? userProfiles[otherId] : null;
                return otherUser?.username || otherUser?.displayName || t.chat;
              })()
            ) : t.chat}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">End-to-End Encrypted</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat List */}
        <div className={`w-full lg:w-72 border-r border-white/10 flex flex-col ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3">
            <button
              onClick={() => setShowNewChat(true)}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" />
              {t.startChat}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t.noMessages}</p>
              </div>
            ) : (
              chats.map(chat => {
                const otherParticipantId = chat.participants.find(p => p !== auth.currentUser?.uid);
                const otherUser = otherParticipantId ? userProfiles[otherParticipantId] : null;
                const displayName = otherUser?.username || otherUser?.displayName || (otherParticipantId ? `User ${otherParticipantId.substring(0, 4)}` : 'Unknown User');
                
                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${activeChat?.id === chat.id ? 'bg-white/5' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {otherUser?.photoURL ? (
                        <img src={otherUser.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        {chat.lastMessage || "No messages"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-zinc-950/50 ${!activeChat ? 'hidden lg:flex items-center justify-center text-zinc-500' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-2.5 rounded-2xl ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 rounded-tl-none'}`}>
                        <p className="text-sm break-words leading-relaxed">{msg.decryptedContent}</p>
                        <p className="text-[9px] opacity-50 mt-1 text-right">
                          {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-zinc-900/50 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t.typeMessage}
                    className="flex-1 bg-zinc-800 border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim() || !recipientPublicKey || !myPublicKey}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                {(!recipientPublicKey || !myPublicKey) && (
                  <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {!myPublicKey ? "Initializing your keys..." : "Waiting for recipient's public key..."}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p>{t.selectProfile}</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold">{t.startChat}</h2>
                <button onClick={() => setShowNewChat(false)} className="text-zinc-500 hover:text-white">
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search users by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-800 border-white/10 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="py-8">
                      <LoadingSpinner message="Searching..." size={24} />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(result => (
                      <button
                        key={result.uid}
                        onClick={() => startNewChat(result)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                          {result.photoURL ? (
                            <img src={result.photoURL} alt={result.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{result.username}</p>
                          <p className="text-xs text-zinc-500">{result.displayName || 'User'}</p>
                        </div>
                      </button>
                    ))
                  ) : searchQuery.trim() ? (
                    <p className="text-center text-zinc-500 py-8">No users found.</p>
                  ) : (
                    <p className="text-center text-zinc-500 py-8">Type a username to search.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
