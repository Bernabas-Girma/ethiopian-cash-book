import React, { useState, useEffect } from 'react';
import { Lock, Delete, Fingerprint } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface LockScreenProps {
  onUnlock: () => void;
  isSetup?: boolean;
  onSetupComplete?: (pin: string) => void;
  onCancelSetup?: () => void;
}

export function LockScreen({ onUnlock, isSetup = false, onSetupComplete, onCancelSetup }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>(isSetup ? 'enter' : 'enter');
  const [error, setError] = useState(false);
  
  const savedPin = localStorage.getItem('app_pin');
  const biometricEnabled = localStorage.getItem('biometric_enabled') === 'true';

  useEffect(() => {
    if (!isSetup && biometricEnabled && pin.length === 0) {
      handleBiometricUnlock();
    }
  }, [isSetup, biometricEnabled]);

  const handleBiometricUnlock = async () => {
    try {
      if (!window.PublicKeyCredential) return;
      
      const credentialId = localStorage.getItem('biometric_id');
      if (!credentialId) return;

      // Convert base64 to buffer
      const binaryString = window.atob(credentialId);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{
            type: "public-key",
            id: bytes.buffer
          }],
          userVerification: "required",
          timeout: 60000,
        }
      });

      if (assertion) {
        onUnlock();
      }
    } catch (err) {
      console.error('Biometric unlock failed:', err);
      if (err instanceof Error && err.message.includes('publickey-credentials-get')) {
        alert("Biometric unlock is restricted in this preview window. Please open the app in a new tab.");
      }
    }
  };

  const handleNumberClick = (num: string) => {
    if (error) setError(false);
    
    if (step === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        
        if (newPin.length === 4) {
          if (isSetup) {
            setTimeout(() => {
              setStep('confirm');
            }, 300);
          } else {
            if (newPin === savedPin) {
              onUnlock();
            } else {
              setError(true);
              setTimeout(() => setPin(''), 500);
            }
          }
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const newConfirmPin = confirmPin + num;
        setConfirmPin(newConfirmPin);
        
        if (newConfirmPin.length === 4) {
          if (newConfirmPin === pin) {
            onSetupComplete?.(pin);
          } else {
            setError(true);
            setTimeout(() => {
              setConfirmPin('');
              setPin('');
              setStep('enter');
            }, 500);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (error) setError(false);
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const title = isSetup 
    ? (step === 'enter' ? 'Create PIN' : 'Confirm PIN')
    : 'Enter PIN';

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="bg-yellow-400/20 p-4 rounded-full mb-6">
          <Lock size={32} className="text-yellow-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">{title}</h2>
        <p className="text-gray-400 text-sm mb-8 h-5">
          {error ? (
            <span className="text-red-400">
              {isSetup ? "PINs don't match. Try again." : "Incorrect PIN"}
            </span>
          ) : (
            isSetup && step === 'enter' ? "Enter a 4-digit PIN" : ""
          )}
        </p>

        <div className="flex space-x-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                "w-4 h-4 rounded-full transition-colors duration-200",
                i < currentPin.length ? "bg-yellow-400" : "bg-gray-800"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="w-20 h-20 rounded-full bg-gray-900 text-white text-2xl font-medium flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
            >
              {num}
            </button>
          ))}
          
          <div className="flex items-center justify-center">
            {!isSetup && biometricEnabled && (
              <button
                onClick={handleBiometricUnlock}
                className="w-20 h-20 rounded-full text-yellow-400 flex items-center justify-center hover:bg-gray-900 active:bg-gray-800 transition-colors"
              >
                <Fingerprint size={32} />
              </button>
            )}
          </div>
          
          <button
            onClick={() => handleNumberClick('0')}
            className="w-20 h-20 rounded-full bg-gray-900 text-white text-2xl font-medium flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
          >
            0
          </button>
          
          <button
            onClick={handleDelete}
            className="w-20 h-20 rounded-full text-gray-400 flex items-center justify-center hover:bg-gray-900 active:bg-gray-800 transition-colors"
          >
            <Delete size={28} />
          </button>
        </div>
      </div>
      
      {isSetup && (
        <button
          onClick={onCancelSetup}
          className="mt-8 text-gray-500 font-bold uppercase tracking-widest text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
