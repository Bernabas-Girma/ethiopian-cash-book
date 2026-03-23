import { Transaction, LanguageStrings } from '../types';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Filter, Pencil, Trash2, FileText, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { exportToPDF } from '../utils/pdfExport';
import { PullToRefresh } from './PullToRefresh';
import { TransactionReceiptModal } from './TransactionReceiptModal';

const availableFields = ['Date', 'Category', 'Source', 'Type', 'Amount', 'Note'];

interface FilterBarProps {
  filters: any;
  setFilters: (filters: any) => void;
  t: LanguageStrings;
  onExport: (fields: string[]) => void;
  selectedFields: string[];
  setSelectedFields: (fields: string[]) => void;
  startDate: Date | undefined;
  setStartDate: (d: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (d: Date | undefined) => void;
}

function FilterBar({ filters, setFilters, t, onExport, selectedFields, setSelectedFields, startDate, setStartDate, endDate, setEndDate }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-xl shadow-sm border border-gray-800/50">
      <div className="flex justify-between items-center">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-1.5 text-xs font-medium text-gray-400">
          <Filter size={14} />
          <span>Filters</span>
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsFieldsOpen(!isFieldsOpen)} className="text-xs font-medium text-gray-400">
            Fields
          </button>
          <button onClick={() => onExport(selectedFields)} className="flex items-center space-x-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-500">
            <FileText size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
      {isFieldsOpen && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {availableFields.map(field => (
            <label key={field} className="flex items-center space-x-2 text-sm text-white">
              <input 
                type="checkbox" 
                checked={selectedFields.includes(field)} 
                onChange={() => toggleField(field)}
                className="rounded border-gray-700 bg-black"
              />
              <span>{field}</span>
            </label>
          ))}
        </div>
      )}
      {isOpen && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="p-2 bg-black border border-gray-700 rounded-lg text-sm text-white">
            <option value="">All Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <input type="text" placeholder="Category" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="p-2 bg-black border border-gray-700 rounded-lg text-sm text-white" />
          <select value={filters.source} onChange={(e) => setFilters({...filters, source: e.target.value})} className="p-2 bg-black border border-gray-700 rounded-lg text-sm text-white">
            <option value="">All Sources</option>
            <option value="Cash">Cash</option>
            <option value="CBE">CBE</option>
            <option value="Telebirr">Telebirr</option>
            <option value="Other">Other</option>
          </select>
          <input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)} className="p-2 bg-black border border-gray-700 rounded-lg text-sm text-white" />
          <input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)} className="p-2 bg-black border border-gray-700 rounded-lg text-sm text-white" />
        </div>
      )}
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  t: LanguageStrings;
  filters: any;
  setFilters: (filters: any) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, t, filters, setFilters, onEdit, onDelete }: TransactionListProps) {
  const [selectedFields, setSelectedFields] = useState(availableFields);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const filteredTransactions = transactions.filter(tx => {
    const txDate = tx.date?.toDate ? tx.date.toDate() : (tx.date instanceof Date ? tx.date : new Date(tx.date || 0));
    return (
      (filters.type === '' || tx.type === filters.type) &&
      (filters.category === '' || tx.category.toLowerCase().includes(filters.category.toLowerCase())) &&
      (filters.source === '' || tx.source === filters.source) &&
      (!startDate || txDate >= startDate) &&
      (!endDate || txDate <= endDate)
    );
  });

  const handleExport = (fields: string[]) => {
    exportToPDF(filteredTransactions, t, fields, startDate, endDate);
  };

  const handleRefresh = async () => {
    // Since we use real-time listeners, we just simulate a refresh for UX
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  if (filteredTransactions.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          <FilterBar filters={filters} setFilters={setFilters} t={t} onExport={handleExport} selectedFields={selectedFields} setSelectedFields={setSelectedFields} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p>{t.noTransactions}</p>
          </div>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        <FilterBar filters={filters} setFilters={setFilters} t={t} onExport={handleExport} selectedFields={selectedFields} setSelectedFields={setSelectedFields} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
        {filteredTransactions.map((tx) => (
          <div key={tx.id} onClick={() => setSelectedTransaction(tx)} className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-xl shadow-sm border border-gray-800/50 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                tx.type === 'IN' ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
              )}>
                {tx.type === 'IN' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{tx.category}</p>
                <p className="text-[10px] text-gray-400">{tx.date ? format(tx.date?.toDate ? tx.date.toDate() : (tx.date instanceof Date ? tx.date : new Date(tx.date)), 'MMM dd, yyyy') : '...'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="flex flex-col items-end justify-between h-full">
                <div className="text-right">
                  <p className={cn(
                    "text-base font-black",
                    tx.type === 'IN' ? "text-green-400" : "text-red-400"
                  )}>
                    {tx.type === 'IN' ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-[10px] opacity-70">ETB</span>
                  </p>
                </div>
                <div className="flex items-center space-x-0.5">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(tx); }} className="p-1 text-gray-500 hover:text-yellow-400 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} className="p-1 text-gray-500 hover:text-red-600 transition-colors">
                    <Trash2 size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); exportToPDF(transactions, t, availableFields, undefined, undefined, tx.id); }} 
                    className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
                    title="Export PDF"
                  >
                    <FileText size={12} />
                  </button>
                </div>
                {tx.note && <p className="text-[9px] text-gray-500 truncate max-w-[80px] mt-0.5 italic">{tx.note}</p>}
              </div>
            </div>
          </div>
        ))}
        {selectedTransaction && (
          <TransactionReceiptModal 
            transaction={selectedTransaction} 
            t={t} 
            onClose={() => setSelectedTransaction(null)} 
          />
        )}
      </div>
    </PullToRefresh>
  );
}
