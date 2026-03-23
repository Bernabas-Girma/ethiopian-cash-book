import { Transaction, LanguageStrings } from '../types';
import { format } from 'date-fns';
import { X, FileText, Printer } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';

interface TransactionReceiptModalProps {
  transaction: Transaction;
  t: LanguageStrings;
  onClose: () => void;
}

export function TransactionReceiptModal({ transaction, t, onClose }: TransactionReceiptModalProps) {
  const date = transaction.date?.toDate ? transaction.date.toDate() : (transaction.date instanceof Date ? transaction.date : new Date(transaction.date));

  const handleExport = () => {
    exportToPDF([transaction], t, ['Date', 'Category', 'Source', 'Type', 'Amount', 'Note'], undefined, undefined, transaction.id);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X size={24} />
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-black">Receipt</h2>
          <p className="text-gray-500 text-sm">{t.appName}</p>
        </div>

        <div className="space-y-4 text-sm text-gray-800">
          <div className="flex justify-between border-b pb-2 border-dashed">
            <span className="font-bold">Date:</span>
            <span>{format(date, 'MMM dd, yyyy HH:mm')}</span>
          </div>
          <div className="flex justify-between border-b pb-2 border-dashed">
            <span className="font-bold">Category:</span>
            <span>{transaction.category}</span>
          </div>
          <div className="flex justify-between border-b pb-2 border-dashed">
            <span className="font-bold">Source:</span>
            <span>{transaction.source}</span>
          </div>
          <div className="flex justify-between border-b pb-2 border-dashed">
            <span className="font-bold">Type:</span>
            <span className={transaction.type === 'IN' ? 'text-green-600' : 'text-red-600'}>{transaction.type}</span>
          </div>
          <div className="flex justify-between border-b pb-2 border-dashed">
            <span className="font-bold">Amount:</span>
            <span className="font-black text-lg">{transaction.amount.toLocaleString()} ETB</span>
          </div>
          {transaction.note && (
            <div className="pt-2">
              <p className="font-bold">Note:</p>
              <p className="text-gray-600 italic">{transaction.note}</p>
            </div>
          )}
        </div>

        <button 
          onClick={handleExport}
          className="w-full mt-8 bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors"
        >
          <FileText size={18} />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
}
