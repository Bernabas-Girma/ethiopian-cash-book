import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, LanguageStrings } from '../types';
import { format } from 'date-fns';

export const exportToPDF = (
  transactions: Transaction[], 
  t: LanguageStrings, 
  fields: string[], 
  startDate?: Date,
  endDate?: Date,
  transactionId?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header Section
  doc.setFontSize(22);
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.text(t.appName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Gray-500
  const reportDate = format(new Date(), 'MMM dd, yyyy HH:mm');
  doc.text(`Report Generated: ${reportDate}`, 14, 28);
  
  if (startDate || endDate) {
    const rangeText = `Period: ${startDate ? format(startDate, 'MMM dd, yyyy') : 'Start'} - ${endDate ? format(endDate, 'MMM dd, yyyy') : 'Present'}`;
    doc.text(rangeText, 14, 34);
  }
  
  let targetTransactions = transactionId
    ? transactions.filter(tx => tx.id === transactionId)
    : transactions;
  
  if (startDate) {
    targetTransactions = targetTransactions.filter(tx => {
      const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return d >= startDate;
    });
  }
  if (endDate) {
    targetTransactions = targetTransactions.filter(tx => {
      const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return d <= endDate;
    });
  }
  
  const totalIncome = targetTransactions
    .filter(tx => tx.type === 'IN')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = targetTransactions
    .filter(tx => tx.type === 'OUT')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const balance = totalIncome - totalExpense;
  
  const fieldMapping: Record<string, (tx: Transaction) => string> = {
    'Date': (tx) => {
      const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return format(d, 'yyyy-MM-dd');
    },
    'Category': (tx) => tx.category,
    'Source': (tx) => tx.source,
    'Type': (tx) => tx.type,
    'Amount': (tx) => `${tx.amount.toLocaleString()} ETB`,
    'Note': (tx) => tx.note || '-'
  };

  const tableData = targetTransactions.map(tx => 
    fields.map(field => fieldMapping[field](tx))
  );
  
  autoTable(doc, {
    head: [fields],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 24, 39], // Gray-900
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81] // Gray-700
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Gray-50
    },
    margin: { left: 14, right: 14 }
  });
  
  const finalY = (doc as any).lastAutoTable.finalY || 45;
  
  // Summary Section
  const summaryX = pageWidth - 70;
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  
  doc.text('Summary', summaryX, finalY + 15);
  doc.setLineWidth(0.5);
  doc.line(summaryX, finalY + 17, pageWidth - 14, finalY + 17);
  
  doc.setFontSize(9);
  doc.text(`${t.totalIn}:`, summaryX, finalY + 25);
  doc.text(`${totalIncome.toLocaleString()} ETB`, pageWidth - 14, finalY + 25, { align: 'right' });
  
  doc.text(`${t.totalOut}:`, summaryX, finalY + 32);
  doc.text(`${totalExpense.toLocaleString()} ETB`, pageWidth - 14, finalY + 32, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.balance}:`, summaryX, finalY + 42);
  doc.text(`${balance.toLocaleString()} ETB`, pageWidth - 14, finalY + 42, { align: 'right' });
  
  doc.save(transactionId ? `transaction_${transactionId}.pdf` : 'transactions_report.pdf');
};
