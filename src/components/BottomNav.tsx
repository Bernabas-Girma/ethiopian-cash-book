import { Home, History, BarChart2, Settings, Target, MessageSquare, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { LanguageStrings } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: LanguageStrings;
}

export function BottomNav({ activeTab, setActiveTab, t }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'history', icon: History, label: t.history },
    { id: 'budgets', icon: Target, label: t.budget },
    { id: 'reminders', icon: Bell, label: t.reminders },
    { id: 'chat', icon: MessageSquare, label: t.chat },
    { id: 'reports', icon: BarChart2, label: t.reports },
    { id: 'settings', icon: Settings, label: t.settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-gray-800/50 flex flex-col z-40 pb-safe">
      <div className="flex justify-around items-center w-full max-w-lg mx-auto bg-gray-900/50 rounded-2xl p-1 border border-gray-800/30 h-16 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-12 space-y-1 transition-all rounded-xl",
              activeTab === tab.id ? "text-yellow-400 bg-yellow-400/10" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <tab.icon size={18} className={cn(activeTab === tab.id ? "scale-110" : "")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
