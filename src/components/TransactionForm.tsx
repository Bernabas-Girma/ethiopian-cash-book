import React, { useState } from 'react';
import { LanguageStrings, TransactionType, TransactionSource } from '../types';
import { X } from 'lucide-react';

interface TransactionFormProps {
  onSubmit: (data: { amount: number; type: TransactionType; source: TransactionSource; category: string; note: string; date: string }) => void;
  onClose: () => void;
  t: LanguageStrings;
  initialData?: any;
}

export function TransactionForm({ onSubmit, onClose, t, initialData }: TransactionFormProps) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'IN');
  const [source, setSource] = useState<TransactionSource>(initialData?.source || 'Cash');
  const [category, setCategory] = useState(initialData?.category || '');
  const [note, setNote] = useState(initialData?.note || '');
  
  // Format initial date for the input (YYYY-MM-DDThh:mm)
  const getInitialDate = () => {
    if (initialData?.date?.toDate) {
      const d = initialData.date.toDate();
      // Adjust for local timezone offset to display correctly in datetime-local
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
    }
    // Default to current local time
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
  };
  
  const [date, setDate] = useState(getInitialDate());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;
    onSubmit({
      amount: parseFloat(amount),
      type,
      source,
      category,
      note,
      date
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300 border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{t.addTransaction}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex p-1 bg-black rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'IN' ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.cashIn}
            </button>
            <button
              type="button"
              onClick={() => setType('OUT')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'OUT' ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.cashOut}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t.amount} (ETB)</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t.source}</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as TransactionSource)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-white"
            >
              <option value="Cash">Cash</option>
              <option value="CBE">CBE</option>
              <option value="Telebirr">Telebirr</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t.category}</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-white"
              placeholder="e.g. Salary, Rent, Food"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{t.note}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none h-20 resize-none text-white"
              placeholder="Optional details..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-gray-400 font-medium hover:bg-gray-800 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/20"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
