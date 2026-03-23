import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AuditLog, LanguageStrings } from '../types';
import { Activity, Plus, Edit2, Trash2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ActivityLogProps {
  profileId: string;
  t: LanguageStrings;
  onUserClick?: (userId: string) => void;
}

export function ActivityLog({ profileId, t, onUserClick }: ActivityLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;

    const q = query(
      collection(db, 'audit_logs'),
      where('profileId', '==', profileId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      } as AuditLog));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileId]);

  const getActionIcon = (log: AuditLog) => {
    if (log.transactionType === 'IN') return <ArrowUpRight size={16} className="text-green-400" />;
    if (log.transactionType === 'OUT') return <ArrowDownRight size={16} className="text-red-400" />;

    switch (log.action) {
      case 'CREATE': return <Plus size={16} className="text-green-400" />;
      case 'UPDATE': return <Edit2 size={16} className="text-blue-400" />;
      case 'DELETE': return <Trash2 size={16} className="text-red-400" />;
      default: return <Activity size={16} className="text-yellow-400" />;
    }
  };

  const getActionColor = (log: AuditLog) => {
    if (log.transactionType === 'IN') return 'bg-green-400/10 border-green-400/20';
    if (log.transactionType === 'OUT') return 'bg-red-400/10 border-red-400/20';

    switch (log.action) {
      case 'CREATE': return 'bg-green-400/10 border-green-400/20';
      case 'UPDATE': return 'bg-blue-400/10 border-blue-400/20';
      case 'DELETE': return 'bg-red-400/10 border-red-400/20';
      default: return 'bg-yellow-400/10 border-yellow-400/20';
    }
  };

  const getTextColor = (log: AuditLog) => {
    if (log.transactionType === 'IN') return 'text-green-400';
    if (log.transactionType === 'OUT') return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity size={48} className="mx-auto mb-4 opacity-20" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div 
          key={log.id} 
          className={cn("p-4 rounded-2xl border flex items-start space-x-4", getActionColor(log))}
        >
          <div className="mt-1 bg-black/50 p-2 rounded-full">
            {getActionIcon(log)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p 
                  className="text-sm font-bold text-white cursor-pointer hover:text-yellow-400 transition-colors"
                  onClick={() => onUserClick?.(log.userId)}
                >
                  {log.userName}
                </p>
                <p className={cn("text-xs mt-1 font-medium", getTextColor(log))}>{log.details}</p>
              </div>
              <div className="flex flex-col items-end">
                {log.amount !== undefined && log.transactionType && (
                  <span className={cn("font-black text-base", getTextColor(log))}>
                    {log.transactionType === 'IN' ? '+' : '-'}{log.amount.toLocaleString()} ETB
                  </span>
                )}
                <span className="text-[10px] text-gray-500 flex items-center mt-0.5">
                  <Clock size={10} className="mr-1" />
                  {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
