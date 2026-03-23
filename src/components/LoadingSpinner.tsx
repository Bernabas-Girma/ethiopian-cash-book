import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  message, 
  size = 32, 
  className = '', 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      <Loader2 size={size} className="text-yellow-400 animate-spin" />
      {message && <p className="text-yellow-400/70 text-sm font-bold uppercase tracking-widest animate-pulse">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
      {content}
    </div>
  );
}
