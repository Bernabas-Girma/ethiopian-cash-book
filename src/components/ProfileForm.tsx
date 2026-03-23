import React, { useState } from 'react';
import { LanguageStrings, Profile } from '../types';
import { X } from 'lucide-react';

interface ProfileFormProps {
  onSubmit: (name: string) => void;
  onClose: () => void;
  t: LanguageStrings;
  initialData?: Profile;
}

export function ProfileForm({ onSubmit, onClose, t, initialData }: ProfileFormProps) {
  const [name, setName] = useState(initialData?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{t.addProfile}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t.profileName}</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-white"
              placeholder="e.g. Personal, Shop, Business"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-gray-400 font-medium hover:bg-gray-800 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
