import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from '../firebase';
import { Reminder, LanguageStrings } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Plus, Trash2, Bell, CheckCircle2, Circle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ReminderListProps {
  currentUser: any;
  t: LanguageStrings;
}

export function ReminderList({ currentUser, t }: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'reminders'),
      where('ownerId', '==', currentUser.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const reminderData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      })) as Reminder[];
      setReminders(reminderData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reminders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.title || !newReminder.dueDate) return;

    try {
      await addDoc(collection(db, 'reminders'), {
        ownerId: currentUser.uid,
        title: newReminder.title,
        description: newReminder.description,
        dueDate: new Date(newReminder.dueDate),
        completed: false,
        createdAt: serverTimestamp(),
      });
      setShowAdd(false);
      setNewReminder({ title: '', description: '', dueDate: '' });
    } catch (err) {
      console.error('Error adding reminder:', err);
    }
  };

  const toggleComplete = async (reminder: Reminder) => {
    try {
      await updateDoc(doc(db, 'reminders', reminder.id), {
        completed: !reminder.completed
      });
    } catch (err) {
      console.error('Error updating reminder:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-white tracking-tight">{t.reminders}</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-yellow-400 text-black px-3 py-1.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-yellow-500 transition-all text-sm"
        >
          <Plus size={18} />
          <span>{t.addReminder}</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800 shadow-2xl animate-in zoom-in duration-200">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.title}</label>
              <input
                type="text"
                required
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                placeholder="e.g. Pay Rent, CBE Transfer..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.dueDate}</label>
              <input
                type="datetime-local"
                required
                value={newReminder.dueDate}
                onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">{t.description}</label>
              <textarea
                value={newReminder.description}
                onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-2xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none text-sm h-20 resize-none"
                placeholder="Optional details..."
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-yellow-400 text-black py-3 rounded-2xl font-bold hover:bg-yellow-500 transition-all text-sm"
              >
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-800 text-white py-3 rounded-2xl font-bold hover:bg-gray-700 transition-all text-sm"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <LoadingSpinner message="Loading reminders..." />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-10 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
          <Bell className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{t.noReminders}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {reminders.map((reminder) => {
            const dueDate = reminder.dueDate?.toDate ? reminder.dueDate.toDate() : new Date(reminder.dueDate);
            const isOverdue = !reminder.completed && dueDate < new Date();

            return (
              <div 
                key={reminder.id} 
                className={cn(
                  "bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800 shadow-xl group transition-all",
                  reminder.completed && "opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => toggleComplete(reminder)}
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        reminder.completed ? "text-emerald-500" : "text-gray-500 hover:text-yellow-400"
                      )}
                    >
                      {reminder.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div>
                      <h3 className={cn(
                        "text-base font-black text-white",
                        reminder.completed && "line-through text-gray-500"
                      )}>
                        {reminder.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <Clock size={12} className={isOverdue ? "text-red-400" : "text-gray-500"} />
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          isOverdue ? "text-red-400" : "text-gray-500"
                        )}>
                          {format(dueDate, 'MMM dd, yyyy HH:mm')}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {reminder.description && (
                  <p className="text-xs text-gray-400 ml-10 mt-1 leading-relaxed">
                    {reminder.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
