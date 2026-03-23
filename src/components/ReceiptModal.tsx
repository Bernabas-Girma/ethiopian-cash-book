import { Transaction, LanguageStrings } from '../types';
import { format } from 'date-fns';
import { X, Download, Share2, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
  t: LanguageStrings;
}

export function ReceiptModal({ transaction, onClose, t }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt-${transaction.id.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const txDate = transaction.date?.toDate ? transaction.date.toDate() : (transaction.date instanceof Date ? transaction.date : new Date(transaction.date));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header Actions */}
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
            <button 
              onClick={handleDownloadPDF}
              className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              title="Download PDF"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-8 pt-12" ref={receiptRef}>
            {/* Receipt Content */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner",
                transaction.type === 'IN' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                {transaction.type === 'IN' ? 'Payment Received' : 'Payment Sent'}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                {format(txDate, 'MMMM dd, yyyy • HH:mm')}
              </p>
            </div>

            {/* Amount Section */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-center border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
              <div className="flex items-center justify-center space-x-2">
                <span className={cn(
                  "text-4xl font-black",
                  transaction.type === 'IN' ? "text-green-600" : "text-red-600"
                )}>
                  {transaction.type === 'IN' ? '+' : '-'}{transaction.amount.toLocaleString()}
                </span>
                <span className="text-lg font-bold text-gray-400">ETB</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Category</span>
                <span className="text-sm font-black text-gray-800">{transaction.category}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Source</span>
                <span className="text-sm font-black text-gray-800">{transaction.source}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-3">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Transaction ID</span>
                <span className="text-[10px] font-mono font-bold text-gray-500">{transaction.id}</span>
              </div>
              {transaction.note && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Note</span>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                    "{transaction.note}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t-2 border-dashed border-gray-100">
              <div className="inline-block px-4 py-1 bg-yellow-400 text-black text-[10px] font-black rounded-full uppercase tracking-widest mb-4">
                {t.appName}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Thank you for using our digital cash book service.
              </p>
            </div>

            {/* Decorative "Paid" Stamp */}
            <div className="absolute bottom-12 right-8 opacity-10 pointer-events-none transform -rotate-12">
              <div className={cn(
                "border-4 px-4 py-2 rounded-lg text-4xl font-black uppercase",
                transaction.type === 'IN' ? "border-green-600 text-green-600" : "border-red-600 text-red-600"
              )}>
                {transaction.type === 'IN' ? 'Received' : 'Paid'}
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex space-x-3">
            <button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-transform"
            >
              <Download size={18} />
              <span>Export PDF</span>
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Transaction Receipt',
                    text: `Receipt for ${transaction.amount} ETB - ${transaction.category}`,
                    url: window.location.href
                  });
                }
              }}
              className="w-12 h-12 bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            >
              <Share2 size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
