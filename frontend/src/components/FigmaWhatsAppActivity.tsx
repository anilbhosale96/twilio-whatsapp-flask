import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { TransactionItem } from '../types';

interface FigmaWhatsAppActivityProps {
  transactions?: TransactionItem[];
}

interface ActivityItem {
  id: string;
  message: string;
  time: string;
  product: string;
  qty: string;
  action: 'ADD' | 'REMOVE';
  status: 'Processed' | 'Needs Clarification';
  reply: string;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    message: '10 Tata Salt aaya',
    time: 'Today, 10:24 AM',
    product: 'Tata Salt',
    qty: '10 packets',
    action: 'ADD',
    status: 'Processed',
    reply: 'Inventory updated. Tata Salt is now at 18 packets.'
  },
  {
    id: '2',
    message: 'Add 20 Parle',
    time: 'Today, 9:16 AM',
    product: 'Parle',
    qty: '20 packets',
    action: 'ADD',
    status: 'Needs Clarification',
    reply: 'Which Parle product should I add? Parle G, Monaco, or Hide & Seek?'
  },
  {
    id: '3',
    message: '5 Amul milk sold',
    time: 'Yesterday, 6:42 PM',
    product: 'Amul Milk',
    qty: '5 packets',
    action: 'REMOVE',
    status: 'Processed',
    reply: 'Done. 5 Amul Milk packets removed from stock.'
  },
  {
    id: '4',
    message: 'Bhai 12 Fortune Oil aur 15 Maggi noodles add karo',
    time: 'Yesterday, 2:18 PM',
    product: 'Fortune Oil & Maggi',
    qty: '12 L & 15 pkts',
    action: 'ADD',
    status: 'Processed',
    reply: 'Stock updated! Added 12L Fortune Oil and 15 packets Maggi.'
  }
];

export const FigmaWhatsAppActivity: React.FC<FigmaWhatsAppActivityProps> = ({ transactions: _transactions }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Processed' | 'Needs Clarification'>('All');

  const filtered = DEFAULT_ACTIVITIES.filter((item) => {
    const matchesSearch =
      item.message.toLowerCase().includes(search.toLowerCase()) ||
      item.product.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>WhatsApp Activity</h1>
          <p>See how SmartStock AI understands and processes your messages.</p>
        </div>
        <span className="connected">
          <i /> WhatsApp connected
        </span>
      </div>

      <div className="activity-layout">
        {/* Main Feed */}
        <section className="activity-feed space-y-4">
          <div className="toolbar flex flex-col sm:flex-row gap-2">
            <div className="field-search flex-1">
              <FigmaIcon name="search" size={17} />
              <input
                aria-label="Search messages"
                placeholder="Search messages by product or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] cursor-pointer"
            >
              <option value="All">All statuses</option>
              <option value="Processed">Processed</option>
              <option value="Needs Clarification">Needs Clarification</option>
            </select>
          </div>

          <div className="space-y-4">
            {filtered.map((item) => (
              <article key={item.id} className="activity-card">
                {/* Incoming Message Header */}
                <div className="activity-message">
                  <span className="wa-round">
                    <FigmaIcon name="whatsapp" size={18} />
                  </span>
                  <div>
                    <small>INCOMING MESSAGE</small>
                    <p>“{item.message}”</p>
                    <span>{item.time}</span>
                  </div>
                  <span
                    className={`status ${
                      item.status === 'Processed' ? 'status-normal' : 'status-blue'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* AI Interpretation */}
                <div className="interpretation">
                  <div className="interpret-title">
                    <FigmaIcon name="sparkle" size={16} />
                    <b>AI Interpretation</b>
                  </div>
                  <div className="interpret-grid">
                    <span>
                      <small>ACTION</small>
                      <b className={item.action === 'ADD' ? 'positive' : 'negative'}>
                        {item.action === 'ADD' ? '+ Stock In' : '− Stock Out'}
                      </b>
                    </span>
                    <span>
                      <small>QUANTITY</small>
                      <b>{item.qty}</b>
                    </span>
                    <span>
                      <small>PRODUCT</small>
                      <b>{item.product}</b>
                    </span>
                    <span>
                      <small>CONFIDENCE</small>
                      <b>98% match</b>
                    </span>
                  </div>
                </div>

                {/* Automated AI Reply */}
                <div className="ai-reply">
                  <span className="wa-round">
                    <FigmaIcon name="sparkle" size={15} />
                  </span>
                  <div>
                    <small>AUTOMATED WHATSAPP REPLY</small>
                    <p>{item.reply}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Side Summary */}
        <aside className="activity-summary panel h-fit p-5 space-y-4">
          <h3 className="font-bold text-sm text-[#17213a] dark:text-[#f8fafc]">Understanding Accuracy</h3>
          <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
            SmartStock AI understood 32 of 34 messages today without needing clarification.
          </p>

          <div className="p-3.5 rounded-xl bg-[#eef5ff] dark:bg-[#162032] border border-[#dce7f7] dark:border-[#1e293b]">
            <div className="text-2xl font-bold text-[#1768e5] dark:text-[#60a5fa]">94.1%</div>
            <div className="text-xs text-[#58657d] dark:text-[#94a3b8]">Direct match rate</div>
          </div>

          <div className="space-y-2 text-xs text-[#58657d] dark:text-[#94a3b8]">
            <div className="flex justify-between">
              <span>Hinglish messages</span>
              <b>68%</b>
            </div>
            <div className="flex justify-between">
              <span>Pure Hindi notes</span>
              <b>22%</b>
            </div>
            <div className="flex justify-between">
              <span>English / Marathi</span>
              <b>10%</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

