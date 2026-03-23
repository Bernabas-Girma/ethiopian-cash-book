import { Plus, User, Pencil, Trash2, Users } from 'lucide-react';
import { Profile, LanguageStrings } from '../types';
import { cn } from '../lib/utils';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedProfileId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => void;
  t: LanguageStrings;
  currentUserId: string;
}

export function ProfileSelector({ profiles, selectedProfileId, onSelect, onAdd, onEdit, onDelete, t, currentUserId }: ProfileSelectorProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pt-1 pb-1 no-scrollbar">
      <button
        onClick={onAdd}
        className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-gray-800 flex items-center justify-center text-gray-600 hover:border-yellow-400/50 hover:text-yellow-400 transition-all hover:bg-yellow-400/5"
      >
        <Plus size={20} />
      </button>
      {profiles.map((profile) => {
        const isShared = profile.members && profile.members.length > 0;
        const isOwner = profile.ownerId === currentUserId;

        return (
          <div key={profile.id} className="relative flex flex-col items-center space-y-1 group">
            <button
              onClick={() => onSelect(profile.id)}
              onDoubleClick={() => onEdit(profile)}
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg",
                selectedProfileId === profile.id 
                  ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-black scale-105" 
                  : "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500 hover:text-gray-300 border border-gray-700/50"
              )}
              title={profile.name}
            >
              {isShared ? <Users size={18} /> : <User size={18} />}
            </button>
            <span className="text-[9px] text-gray-400 truncate w-14 text-center">{profile.name}</span>
            {isOwner && (
              <div className="absolute -top-2 -right-2 hidden group-hover:flex space-x-1 bg-black p-1 rounded-lg border border-gray-800">
                <button onClick={() => onEdit(profile)} className="text-gray-400 hover:text-yellow-400">
                  <Pencil size={12} />
                </button>
                <button onClick={() => onDelete(profile.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
