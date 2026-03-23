import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from '../firebase';
import { Budget, LanguageStrings, Profile } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Plus, Trash2, PieChart, Target, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface BudgetsProps {
  selectedProfile: Profile;
  currentUser: any;
  t: LanguageStrings;
}

export function Budgets({ selectedProfile, currentUser, t }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: '',
    amount: '',
    period: 'monthly' as const,
  });

  useEffect(() => {
    const q = query(
      collection(db, 'budgets'),
      where('profileId', '==', selectedProfile.id)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const budgetData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      })) as Budget[];
      setBudgets(budgetData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProfile.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.amount) return;

    try {
      await addDoc(collection(db, 'budgets'), {
        profileId: selectedProfile.id,
        category: newBudget.category,
        amount: parseFloat(newBudget.amount),
        period: newBudget.period,
        ownerId: currentUser.uid,
        startDate: serverTimestamp(),
      });
      setShowAdd(false);
      setNewBudget({ category: '', amount: '', period: 'monthly' });
    } catch (err) {
      console.error('Error adding budget:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'budgets', id));
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-white tracking-tight">{t.budget}</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-yellow-400 text-black px-3 py-1.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-yellow-500 transition-all text-sm"
        >
          <Plus size={18} />
          <span>{t.createBudget}</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800 shadow-2xl animate-in zoom-in duration-200">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.category}</label>
                <input
                  type="text"
                  required
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                  placeholder="e.g. Food, Rent..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.amount}</label>
                <input
                  type="number"
                  required
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Period</label>
              <div className="flex bg-black p-1 rounded-2xl border border-gray-800">
                {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewBudget({ ...newBudget, period: p })}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
                      newBudget.period === p ? "bg-yellow-400 text-black" : "text-gray-500"
                    )}
                  >
                    {t[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-yellow-400 text-black py-3 rounded-2xl font-bold hover:bg-yellow-500 transition-all"
              >
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-800 text-white py-3 rounded-2xl font-bold hover:bg-gray-700 transition-all"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <LoadingSpinner message="Loading budgets..." />
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-10 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
          <Target className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No budgets set for this profile</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {budgets.map((budget) => (
            <div key={budget.id} className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800 shadow-xl group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-400/10 p-2 rounded-xl">
                    <PieChart className="text-yellow-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{budget.category}</h3>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t[budget.period]}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(budget.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Target Amount</p>
                  <p className="text-xl font-black text-white">{budget.amount.toLocaleString()} <span className="text-[10px] font-bold text-gray-500">ETB</span></p>
                </div>
                <div className="text-right">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-yellow-400 w-0" />
                  </div>
                  <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest">0% Used</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
