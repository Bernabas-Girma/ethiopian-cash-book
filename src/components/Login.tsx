import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification
} from '../firebase';
import { Wallet, Mail, Lock, ArrowRight, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginProps {
  onSuccess: (user: any) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [method, setMethod] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      if (emailMode === 'signup') {
        result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess(result.user);
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onSuccess(result.user);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black to-yellow-900 p-6 text-white">
      <div className="mb-8 text-center">
        <div className="bg-yellow-400/20 p-4 rounded-3xl inline-block mb-4">
          <Wallet size={64} className="text-yellow-400" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight">የሂሳብ መዝገብ</h1>
        <p className="text-yellow-100 font-medium">Ethiopian Cash Book</p>
      </div>
      
      <div className="w-full max-w-sm space-y-6">
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              setMethod('google');
              setError(null);
            }}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              method === 'google' ? "bg-yellow-400 text-black" : "text-gray-400"
            )}
          >
            Google
          </button>
          <button
            onClick={() => {
              setMethod('email');
              setError(null);
            }}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              method === 'email' ? "bg-yellow-400 text-black" : "text-gray-400"
            )}
          >
            Email
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-start space-x-3 text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {method === 'google' ? (
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl shadow-xl hover:bg-yellow-500 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            )}
            <span>Sign in with Google</span>
          </button>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-yellow-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-yellow-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl shadow-xl hover:bg-yellow-500 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {emailMode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
                  <span>{emailMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailMode(emailMode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="w-full text-gray-400 text-sm font-bold hover:text-white transition-colors flex items-center justify-center space-x-2"
            >
              <span>{emailMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}
      </div>
      
      <p className="mt-12 text-yellow-200 text-sm">Manage your cash flow easily</p>
    </div>
  );
}
