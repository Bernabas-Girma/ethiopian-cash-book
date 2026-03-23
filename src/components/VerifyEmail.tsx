import React, { useState, useEffect } from 'react';
import { auth, sendEmailVerification, signOut } from '../firebase';
import { Mail, Loader2, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { LanguageStrings } from '../types';

interface VerifyEmailProps {
  user: any;
  t: LanguageStrings;
}

export function VerifyEmail({ user, t }: VerifyEmailProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      await sendEmailVerification(user);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setError('Failed to send verification email. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setSending(true);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        window.location.reload();
      } else {
        setError('Email not verified yet. Please check your inbox.');
      }
    } catch (err) {
      console.error('Error reloading user:', err);
      setError('Failed to check status. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="bg-yellow-400/20 p-6 rounded-full inline-block mb-4">
          <Mail size={64} className="text-yellow-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight">Verify Your Email</h2>
          <p className="text-gray-400">
            We've sent a verification link to <span className="text-white font-bold">{user.email}</span>.
            Please check your inbox and click the link to continue.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleCheckStatus}
            className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl shadow-xl hover:bg-yellow-500 transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw size={20} />
            <span>I've Verified My Email</span>
          </button>

          <button
            onClick={handleResend}
            disabled={sending || sent}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl border border-gray-800 hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : sent ? (
              <>
                <CheckCircle2 size={20} className="text-green-400" />
                <span>Email Sent!</span>
              </>
            ) : (
              <span>Resend Verification Email</span>
            )}
          </button>

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center space-x-2 text-gray-500 hover:text-white transition-colors py-2"
          >
            <LogOut size={16} />
            <span className="text-sm font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
