import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  // Transform y value to a rotation for the icon
  const rotate = useTransform(y, [0, 100], [0, 360]);
  const opacity = useTransform(y, [0, 50, 100], [0, 0.5, 1]);
  const scale = useTransform(y, [0, 100], [0.5, 1]);

  const handleDragEnd = async () => {
    const currentY = y.get();
    if (currentY > 80 && !isRefreshing) {
      setIsRefreshing(true);
      // Snap to a visible "refreshing" position
      await controls.start({ y: 60 });
      
      try {
        await onRefresh();
      } finally {
        // Wait a bit for the animation to feel natural
        setTimeout(async () => {
          setIsRefreshing(false);
          await controls.start({ y: 0 });
          y.set(0);
        }, 500);
      }
    } else {
      await controls.start({ y: 0 });
      y.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Refresh Indicator */}
      <motion.div
        style={{ 
          y, 
          opacity, 
          scale,
          left: '50%',
          translateX: '-50%',
          top: 10
        }}
        animate={isRefreshing ? { rotate: 360 } : {}}
        transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
        className="absolute z-50 pointer-events-none"
      >
        <div className="bg-yellow-400 p-2 rounded-full shadow-lg border border-yellow-500/20 flex items-center justify-center">
          <motion.div style={{ rotate: isRefreshing ? 0 : rotate }}>
            <RefreshCw size={20} className="text-black" />
          </motion.div>
        </div>
      </motion.div>

      {/* Content Container */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 200 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ y }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
