import React, { useState } from 'react';
import { Search, Download, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';
import type { TransactionItem } from '../types';

interface TransactionsLogProps {
  transactions: TransactionItem[];
}

export const TransactionsLog: React.FC<TransactionsLogProps> = ({ transactions }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'add' | 'sell'>('all');

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.item_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.raw_text.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' ? true : tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleExportCSV = () => {
    window.location.href = '/api/export.csv';
  };

  const formatISTDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} strokeWidth={1.5} className="absolute left-3 top-3 text-[#64748B] dark:text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions or original messages..."
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Type Filter Buttons */}
          <div className="h-10 p-1 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] flex items-center space-x-1 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('add')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'add'
                  ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              Stock In
            </button>
            <button
              onClick={() => setTypeFilter('sell')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'sell'
                  ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              Sales
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="h-10 px-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F1F5F9] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download size={15} strokeWidth={1.5} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time (IST)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4">Original Message</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#243041]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/30 transition-colors ${
                      tx.undone ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                      {formatISTDate(tx.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.type === 'add' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] dark:bg-[#14532D]/40 dark:text-[#22C55E]">
                          <ArrowDownLeft size={13} strokeWidth={2} />
                          <span>Stock In</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#E0E7FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#60A5FA]">
                          <ArrowUpRight size={13} strokeWidth={2} />
                          <span>Sold</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A] dark:text-[#F1F5F9] capitalize">
                      {tx.item_name}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                      {tx.change > 0 ? `+${tx.change}` : tx.change} {tx.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#16A34A] dark:text-[#22C55E] font-medium">
                      {tx.revenue_formatted || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[#64748B] dark:text-[#94A3B8] max-w-xs truncate">
                      "{tx.raw_text}"
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.undone ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#64748B] dark:bg-[#334155] dark:text-[#94A3B8]">
                          <RotateCcw size={11} strokeWidth={1.5} />
                          <span>Undone</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[#16A34A] font-medium">Recorded</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
