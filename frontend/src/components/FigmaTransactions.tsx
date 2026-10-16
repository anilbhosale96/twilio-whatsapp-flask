import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { TransactionItem } from '../types';

interface FigmaTransactionsProps {
  transactions: TransactionItem[];
}

export const FigmaTransactions: React.FC<FigmaTransactionsProps> = ({ transactions }) => {
  const [filterAction, setFilterAction] = useState<'All' | 'add' | 'sell'>('All');

  const filtered = transactions.filter((t) => {
    if (filterAction === 'All') return true;
    return t.type === filterAction;
  });

  const exportCSV = () => {
    const headers = 'ID,Item,Action,QuantityChange,Unit,Price,CreatedAt,RawText\n';
    const rows = filtered
      .map(
        (t) =>
          `${t.id},"${t.item_name}",${t.type},${t.change},"${t.unit}",${t.price || 0},"${t.created_at}","${t.raw_text}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>A complete history of every inventory change.</p>
        </div>
        <button className="btn btn-secondary cursor-pointer" onClick={exportCSV}>
          <FigmaIcon name="download" size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="filter-row flex flex-wrap gap-2">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as any)}
          className="px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] cursor-pointer"
        >
          <option value="All">All actions</option>
          <option value="add">Stock In (add)</option>
          <option value="sell">Stock Out (sell)</option>
        </select>
      </div>

      {/* Transactions Table Panel */}
      <section className="panel simple-table">
        <div className="simple-row table-header">
          <span>TIMESTAMP</span>
          <span>PRODUCT</span>
          <span>QUANTITY</span>
          <span>ACTION</span>
          <span>SOURCE</span>
          <span>USER</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#58657d] dark:text-[#94a3b8]">
            No transactions found.
          </div>
        ) : (
          filtered.map((t) => {
            const isAdd = t.type === 'add';
            const qtyStr = `${isAdd ? '+' : '−'}${Math.abs(t.change)} ${t.unit}`;
            const dateStr = new Date(t.created_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={t.id} className="simple-row hover:bg-[#f8fafc] dark:hover:bg-[#162032]">
                <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">{dateStr}</span>
                <b>{t.item_name}</b>
                <span className={isAdd ? 'positive' : 'negative'}>{qtyStr}</span>
                <span>{isAdd ? 'Stock In' : 'Stock Out'}</span>
                <span>
                  <i className="source-icon wa">
                    <FigmaIcon name="whatsapp" size={13} />
                  </i>
                  WhatsApp
                </span>
                <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">SmartStock AI</span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};

