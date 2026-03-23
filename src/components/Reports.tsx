import { useState, useRef } from 'react';
import { Transaction, LanguageStrings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { Share2, Image as ImageIcon, FileText } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  t: LanguageStrings;
}

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export function Reports({ transactions, t }: ReportsProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const getInterval = (p: Period) => {
    switch (p) {
      case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarterly': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'annual': return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const interval = getInterval(period);
  const filteredTransactions = transactions.filter(tx => {
    const date = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
    return isWithinInterval(date, interval);
  });

  const totalIn = filteredTransactions.filter(t => t.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = filteredTransactions.filter(t => t.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);

  const pieData = [
    { name: t.cashIn, value: totalIn },
    { name: t.cashOut, value: totalOut },
  ];

  const COLORS = ['#FACC15', '#EF4444'];

  const categoryData = filteredTransactions.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      if (curr.type === 'IN') existing.in += curr.amount;
      else existing.out += curr.amount;
    } else {
      acc.push({
        name: curr.category,
        in: curr.type === 'IN' ? curr.amount : 0,
        out: curr.type === 'OUT' ? curr.amount : 0,
      });
    }
    return acc;
  }, []);

  const handleShareText = async () => {
    const text = `📊 *${t.appName} - ${t[period]} Report*\n📅 ${format(interval.start, 'MMM d')} - ${format(interval.end, 'MMM d, yyyy')}\n\n💰 *${t.totalIn}:* ${totalIn.toLocaleString()} ETB\n📉 *${t.totalOut}:* ${totalOut.toLocaleString()} ETB\n⚖️ *${t.balance}:* ${(totalIn - totalOut).toLocaleString()} ETB\n\n*Top Categories:*\n${categoryData.map((c: any) => `- ${c.name}: In ${c.in}, Out ${c.out}`).join('\n')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t.appName} Report`,
          text: text,
        });
      } catch (err) {
        console.error('Error sharing text:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Report copied to clipboard!');
    }
    setShowShareMenu(false);
  };

  const handleShareImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#000000',
        scale: 2,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'report.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${t.appName} Report`,
            });
          } catch (err) {
            console.error('Error sharing image:', err);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'report.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error generating image:', err);
    }
    setShowShareMenu(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Share Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-white">{t.reports}</h2>
        <div className="relative">
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="bg-yellow-400 text-black p-2 rounded-full shadow-lg hover:bg-yellow-500 transition-colors"
          >
            <Share2 size={18} />
          </button>
          
          {showShareMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <button 
                onClick={handleShareText}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-gray-800 transition-colors border-b border-gray-800"
              >
                <FileText size={16} className="text-yellow-400" />
                <span>Share as Text</span>
              </button>
              <button 
                onClick={handleShareImage}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-gray-800 transition-colors"
              >
                <ImageIcon size={16} className="text-yellow-400" />
                <span>Share as Image</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-gray-800/50 overflow-x-auto hide-scrollbar">
        {(['weekly', 'monthly', 'quarterly', 'annual'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 min-w-[80px] py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all",
              period === p ? "bg-yellow-400 text-black shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {t[p]}
          </button>
        ))}
      </div>

      <div ref={reportRef} className="space-y-6 bg-black p-2 -mx-2 rounded-3xl">
        <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800/50 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-3">{t.balance} Summary</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-3xl border border-gray-800/50 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-3">Category Breakdown</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <XAxis dataKey="name" stroke="#4B5563" fontSize={10} fontWeight="bold" />
              <YAxis stroke="#4B5563" fontSize={10} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold' }} />
              <Bar dataKey="in" fill="#FACC15" name={t.cashIn} radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" fill="#EF4444" name={t.cashOut} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
}
