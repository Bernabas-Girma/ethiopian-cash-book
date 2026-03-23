import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Globe, User, Phone, Mail, EyeOff, Save, Camera, Upload, Users, Shield, UserPlus, ChevronRight, Lock, Fingerprint, Bell } from 'lucide-react';
import { LanguageStrings, User as UserType, Profile } from '../types';
import { auth, signOut, db, doc, updateDoc, collection, query, where, getDocs } from '../firebase';
import { cn } from '../lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

import { LockScreen } from './LockScreen';

interface SettingsProps {
  language: 'en' | 'am';
  setLanguage: (lang: 'en' | 'am') => void;
  t: LanguageStrings;
  userData: UserType;
  onUpdateUser: (data: Partial<UserType>) => void;
  profiles: Profile[];
  onManageTeam: (profile: Profile) => void;
}

export function Settings({ language, setLanguage, t, userData, onUpdateUser, profiles, onManageTeam }: SettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [friends, setFriends] = useState<UserType[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userData.displayName || '',
    username: userData.username || '',
    photoURL: userData.photoURL || '',
    phoneNumber: userData.phoneNumber || '',
    hideEmail: userData.hideEmail || false,
    messagePrivacy: userData.messagePrivacy || 'everyone',
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [pinEnabled, setPinEnabled] = useState(!!localStorage.getItem('app_pin'));
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('biometric_enabled') === 'true');
  const [pinAction, setPinAction] = useState<'setup' | 'verify_disable' | 'verify_change' | 'change_setup' | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), formData);
      onUpdateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit for Firestore safety
        alert("Image is too large. Please select an image smaller than 800KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userData.friends || userData.friends.length === 0) {
        setFriends([]);
        return;
      }
      setLoadingFriends(true);
      try {
        const q = query(collection(db, 'users'), where('uid', 'in', userData.friends));
        const querySnapshot = await getDocs(q);
        const friendsData = querySnapshot.docs.map(doc => doc.data() as UserType);
        setFriends(friendsData);
      } catch (err) {
        console.error('Error fetching friends:', err);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [userData.friends]);

  const ownedProfiles = profiles.filter(p => p.ownerId === userData.uid);

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('biometric_id');
      setBiometricEnabled(false);
      return;
    }

    try {
      if (!window.PublicKeyCredential) {
        alert("Biometrics are not supported on this device/browser.");
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Ethiopian Cash Book", id: window.location.hostname },
          user: { id: userId, name: userData.email || "user", displayName: userData.displayName || "User" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        }
      }) as PublicKeyCredential;

      if (credential) {
        const rawId = new Uint8Array(credential.rawId);
        let binaryString = '';
        for (let i = 0; i < rawId.byteLength; i++) {
          binaryString += String.fromCharCode(rawId[i]);
        }
        localStorage.setItem('biometric_id', window.btoa(binaryString));
        localStorage.setItem('biometric_enabled', 'true');
        setBiometricEnabled(true);
      }
    } catch (err) {
      console.error('Biometric setup failed:', err);
      if (err instanceof Error && err.message.includes('publickey-credentials-create')) {
        alert("Biometric setup is restricted in this preview window. Please open the app in a new tab (using the button in the top right) to enable biometric unlock.");
      } else {
        alert("Failed to set up biometrics. Ensure your device supports it and you have a screen lock configured.");
      }
    }
  };

  const handlePinToggle = () => {
    if (pinEnabled) {
      setPinAction('verify_disable');
    } else {
      setPinAction('setup');
    }
  };

  const handlePinSetupComplete = (pin: string) => {
    localStorage.setItem('app_pin', pin);
    setPinEnabled(true);
    setPinAction(null);
  };

  const handlePinUnlock = () => {
    if (pinAction === 'verify_disable') {
      localStorage.removeItem('app_pin');
      setPinEnabled(false);
      if (biometricEnabled) {
        localStorage.removeItem('biometric_enabled');
        localStorage.removeItem('biometric_id');
        setBiometricEnabled(false);
      }
      setPinAction(null);
    } else if (pinAction === 'verify_change') {
      setPinAction('change_setup');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {pinAction && (
        <div className="fixed inset-0 z-[100] bg-black">
          <LockScreen 
            isSetup={pinAction === 'setup' || pinAction === 'change_setup'} 
            onSetupComplete={handlePinSetupComplete} 
            onCancelSetup={() => setPinAction(null)} 
            onUnlock={handlePinUnlock} 
          />
        </div>
      )}
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2.5rem] border border-gray-800/50 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{t.profile}</h3>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all",
              isEditing 
                ? "bg-yellow-400 text-black hover:bg-yellow-500" 
                : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
            )}
          >
            {saving ? (
              <span className="animate-pulse">Saving...</span>
            ) : isEditing ? (
              <><Save size={18} /> <span>Save</span></>
            ) : (
              <span>Edit Profile</span>
            )}
          </button>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div 
              onClick={isEditing ? triggerFileInput : undefined}
              className={cn(
                "w-24 h-24 bg-gray-800 rounded-[2rem] flex items-center justify-center text-yellow-400 border-2 border-gray-700 overflow-hidden transition-all",
                isEditing && "cursor-pointer hover:border-yellow-400"
              )}
            >
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} />
              )}
            </div>
            {isEditing && (
              <div 
                onClick={triggerFileInput}
                className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera size={24} className="text-white" />
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {isEditing && (
            <button
              onClick={triggerFileInput}
              className="flex items-center space-x-2 text-xs font-bold text-yellow-400 uppercase tracking-widest hover:text-yellow-300 transition-colors"
            >
              <Upload size={14} />
              <span>Upload Picture</span>
            </button>
          )}

          <div className="w-full space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Profile Picture URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.photoURL}
                    onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.phoneNumber}</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                    placeholder="+251..."
                  />
                </div>
                <label className="flex items-center space-x-3 p-3 bg-black border border-gray-800 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hideEmail}
                    onChange={(e) => setFormData({ ...formData, hideEmail: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-800 text-yellow-400 focus:ring-yellow-400 bg-black"
                  />
                  <span className="text-sm text-gray-300">{t.hideEmail}</span>
                </label>
                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Who can message me</label>
                  <select
                    value={formData.messagePrivacy}
                    onChange={(e) => setFormData({ ...formData, messagePrivacy: e.target.value as 'everyone' | 'friends' | 'none' })}
                    className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="none">Nobody</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-400 bg-black/50 p-3 rounded-2xl border border-gray-800/50">
                  <User size={18} className="text-yellow-400" />
                  <span className="text-white font-bold">{userData.displayName || 'User'}</span>
                  <span className="text-xs text-gray-500">@{userData.username}</span>
                </div>
                {!userData.hideEmail && (
                  <div className="flex items-center space-x-3 text-gray-400 bg-black/50 p-3 rounded-2xl border border-gray-800/50">
                    <Mail size={18} className="text-yellow-400" />
                    <span className="text-sm">{userData.email}</span>
                  </div>
                )}
                {userData.phoneNumber && (
                  <div className="flex items-center space-x-3 text-gray-400 bg-black/50 p-3 rounded-2xl border border-gray-800/50">
                    <Phone size={18} className="text-yellow-400" />
                    <span className="text-sm">{userData.phoneNumber}</span>
                  </div>
                )}
                {userData.hideEmail && (
                  <div className="flex items-center space-x-3 text-gray-500 bg-black/50 p-3 rounded-2xl border border-gray-800/50 italic">
                    <EyeOff size={18} />
                    <span className="text-xs">Email is hidden</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Management Section */}
      <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2.5rem] border border-gray-800/50 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-yellow-400/20 p-2 rounded-xl">
            <Users className="text-yellow-400" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">{t.team} Management</h3>
        </div>

        <div className="space-y-3">
          {ownedProfiles.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">You don't own any profiles yet.</p>
          ) : (
            ownedProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => onManageTeam(profile)}
                className="w-full flex items-center justify-between p-4 bg-black/50 rounded-2xl border border-gray-800 hover:border-yellow-400/50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-yellow-400 font-black">
                    {profile.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">{profile.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      {profile.members?.length || 0} Members
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-yellow-400 transition-colors" size={20} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Friends Section */}
      <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2.5rem] border border-gray-800/50 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-400/20 p-2 rounded-xl">
              <UserPlus className="text-yellow-400" size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Friends</h3>
          </div>
          <span className="bg-gray-800 px-3 py-1 rounded-full text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
            {friends.length} Total
          </span>
        </div>

        <div className="space-y-3">
          {loadingFriends ? (
            <div className="py-4">
              <LoadingSpinner message="Loading friends..." size={24} />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">No friends added yet. Share a profile to add friends!</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {friends.map(friend => (
                <div key={friend.uid} className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-yellow-400 font-black overflow-hidden">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.username} className="w-full h-full object-cover" />
                      ) : (
                        friend.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">@{friend.username}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{friend.displayName || 'No Name'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield size={14} className="text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2.5rem] border border-gray-800/50 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-yellow-400/20 p-2 rounded-xl">
            <Shield className="text-yellow-400" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">Security</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-black/50 rounded-2xl border border-gray-800">
            <div className="flex items-center space-x-3">
              <Lock className="text-yellow-400" size={20} />
              <div>
                <p className="font-bold text-white">PIN Lock</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Require PIN to open app</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={pinEnabled} onChange={handlePinToggle} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
            </label>
          </div>

          {pinEnabled && (
            <>
              <div className="flex items-center justify-between p-4 bg-black/50 rounded-2xl border border-gray-800">
                <div className="flex items-center space-x-3">
                  <Lock className="text-yellow-400" size={20} />
                  <div>
                    <p className="font-bold text-white">Change PIN</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Update your current PIN</p>
                  </div>
                </div>
                <button
                  onClick={() => setPinAction('verify_change')}
                  className="bg-gray-800 text-yellow-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-700 transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/50 rounded-2xl border border-gray-800">
                <div className="flex items-center space-x-3">
                  <Fingerprint className="text-yellow-400" size={20} />
                  <div>
                    <p className="font-bold text-white">Biometric Unlock</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Use fingerprint or Face ID</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={biometricEnabled} onChange={handleBiometricToggle} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* App Settings */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] border border-gray-800/50 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-300">
            <Bell size={20} className="text-yellow-400" />
            <span className="font-bold">Notifications</span>
          </div>
          <button
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    alert('Notifications enabled!');
                  } else {
                    alert('Notifications denied. Please enable them in your browser settings.');
                  }
                });
              } else {
                alert('Notifications not supported in this browser.');
              }
            }}
            className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500 transition-colors"
          >
            Enable
          </button>
        </div>
        <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-gray-300">
            <Globe size={20} className="text-yellow-400" />
            <span className="font-bold">{t.language}</span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'am')}
            className="bg-black border border-gray-800 rounded-xl p-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>

        <button
          onClick={() => signOut(auth)}
          className="w-full p-6 flex items-center space-x-3 text-red-400 hover:bg-red-400/5 transition-colors font-bold"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="text-center text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        <p>Ethiopian Cash Book v1.1.0</p>
        <p>© 2026</p>
      </div>
    </div>
  );
}
