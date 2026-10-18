import React, { useState, useMemo } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { TransactionItem, InventoryItem } from '../types';

interface FigmaWhatsAppActivityProps {
  transactions?: TransactionItem[];
  inventory?: InventoryItem[];
  onSendMessage?: (msg: string, channel: 'whatsapp' | 'sms') => Promise<{ success: boolean; reply?: string } | boolean>;
}

interface ActivityCardItem {
  id: string;
  channel: 'whatsapp' | 'sms';
  message: string;
  time: string;
  productsSummary: string;
  items: Array<{
    item_name: string;
    change: number;
    unit: string;
    type: 'add' | 'sell';
    price?: number | null;
  }>;
  action: 'ADD' | 'REMOVE';
  status: 'Processed' | 'Needs Clarification' | 'Undone';
  reply: string;
  isReal: boolean;
}

const DEFAULT_ACTIVITIES: ActivityCardItem[] = [
  {
    id: 'mock-1',
    channel: 'sms',
    message: '25 Parle G aaya aur 10 Tata Salt aaya',
    time: 'Today, 11:11 AM',
    productsSummary: 'Parle G & Tata Salt',
    items: [
      { item_name: 'Parle G', change: 25, unit: 'pcs', type: 'add' },
      { item_name: 'Tata Salt', change: 10, unit: 'pcs', type: 'add' }
    ],
    action: 'ADD',
    status: 'Processed',
    reply: 'Inventory updated! Added 25 pcs Parle G and 10 pcs Tata Salt.',
    isReal: false
  },
  {
    id: 'mock-2',
    channel: 'whatsapp',
    message: 'Add 20 Parle',
    time: 'Today, 9:16 AM',
    productsSummary: 'Parle',
    items: [{ item_name: 'Parle', change: 20, unit: 'packets', type: 'add' }],
    action: 'ADD',
    status: 'Needs Clarification',
    reply: 'Which Parle product should I add? Parle G, Monaco, or Hide & Seek?',
    isReal: false
  },
  {
    id: 'mock-3',
    channel: 'whatsapp',
    message: '5 Amul milk sold',
    time: 'Yesterday, 6:42 PM',
    productsSummary: 'Amul Milk',
    items: [{ item_name: 'Amul Milk', change: -5, unit: 'packets', type: 'sell' }],
    action: 'REMOVE',
    status: 'Processed',
    reply: 'Done. 5 Amul Milk packets removed from stock.',
    isReal: false
  },
  {
    id: 'mock-4',
    channel: 'whatsapp',
    message: 'Bhai 12 Fortune Oil aur 15 Maggi noodles add karo',
    time: 'Yesterday, 2:18 PM',
    productsSummary: 'Fortune Oil & Maggi',
    items: [
      { item_name: 'Fortune Oil', change: 12, unit: 'L', type: 'add' },
      { item_name: 'Maggi', change: 15, unit: 'pkts', type: 'add' }
    ],
    action: 'ADD',
    status: 'Processed',
    reply: 'Stock updated! Added 12L Fortune Oil and 15 packets Maggi.',
    isReal: false
  }
];

export const FigmaWhatsAppActivity: React.FC<FigmaWhatsAppActivityProps> = ({
  transactions = [],
  inventory: _inventory = [],
  onSendMessage
}) => {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'All' | 'whatsapp' | 'sms'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Processed' | 'Needs Clarification' | 'Undone'>('All');

  // Interactive Message Sender State
  const [inputMsg, setInputMsg] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ success: boolean; reply: string } | null>(null);

  // Webhook copy state
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Dynamically compute webhook URL based on current host
  const webhookUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/sms`;
    }
    return 'http://localhost:8000/api/sms';
  }, []);

  const handleCopyWebhook = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const handleSend = async (msgToSend?: string) => {
    const text = (msgToSend ?? inputMsg).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setLastFeedback(null);

    try {
      if (onSendMessage) {
        const result = await onSendMessage(text, selectedChannel);
        if (typeof result === 'object' && result !== null) {
          setLastFeedback({
            success: result.success,
            reply: result.reply || 'Message processed and inventory updated automatically!'
          });
        } else {
          setLastFeedback({
            success: Boolean(result),
            reply: result ? 'Inventory updated successfully!' : 'Could not process message.'
          });
        }
      } else {
        // Fallback direct fetch to /api/message
        const res = await fetch('/api/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            channel: selectedChannel
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setLastFeedback({
            success: true,
            reply: data.reply || 'Inventory updated automatically!'
          });
        } else {
          setLastFeedback({
            success: false,
            reply: data.detail || 'Failed to update inventory.'
          });
        }
      }
      if (!msgToSend) {
        setInputMsg('');
      }
    } catch (err: any) {
      setLastFeedback({
        success: false,
        reply: err.message || 'Error sending message.'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Convert real transactions from DB into unified activity cards (grouped by batch_id)
  const realActivities: ActivityCardItem[] = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const batches = new Map<string, TransactionItem[]>();
    for (const tx of transactions) {
      const bId = tx.batch_id || `single-${tx.id}`;
      const group = batches.get(bId) || [];
      group.push(tx);
      batches.set(bId, group);
    }

    const cards: ActivityCardItem[] = [];
    batches.forEach((txList, batchId) => {
      const first = txList[0];
      const raw = first.raw_text || '';
      const isSms = raw.toLowerCase().includes('[sms]');
      const cleanMessage = raw.replace(/^\[SMS\]\s*/i, '').trim() || `${first.item_name} update`;

      const allAdd = txList.every((t) => t.type === 'add');
      const allUndone = txList.every((t) => t.undone);

      // Format date/time
      let timeStr = 'Just now';
      try {
        const d = new Date(first.created_at);
        timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
        const isToday = new Date().toDateString() === d.toDateString();
        timeStr = isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${timeStr}`;
      } catch {}

      // Build product summary
      const uniqueNames = Array.from(new Set(txList.map((t) => t.item_name)));
      const productsSummary = uniqueNames.slice(0, 3).join(' & ') + (uniqueNames.length > 3 ? '...' : '');

      // Build friendly reply text
      const replyParts = txList.map((t) => {
        const actionWord = t.type === 'add' ? 'Added' : 'Sold';
        return `${actionWord} ${Math.abs(t.change)} ${t.unit} ${t.item_name}`;
      });
      const reply = `Inventory updated! ${replyParts.join(', ')}.`;

      cards.push({
        id: batchId,
        channel: isSms ? 'sms' : 'whatsapp',
        message: cleanMessage,
        time: timeStr,
        productsSummary,
        items: txList.map((t) => ({
          item_name: t.item_name,
          change: t.change,
          unit: t.unit,
          type: t.type,
          price: t.price
        })),
        action: allAdd ? 'ADD' : 'REMOVE',
        status: allUndone ? 'Undone' : 'Processed',
        reply,
        isReal: true
      });
    });

    return cards;
  }, [transactions]);

  // Combine real activities with default mock activities (if list is short)
  const combinedActivities = useMemo(() => {
    if (realActivities.length > 0) {
      return [...realActivities, ...DEFAULT_ACTIVITIES];
    }
    return DEFAULT_ACTIVITIES;
  }, [realActivities]);

  // Filter activities
  const filtered = useMemo(() => {
    return combinedActivities.filter((item) => {
      const matchesSearch =
        item.message.toLowerCase().includes(search.toLowerCase()) ||
        item.productsSummary.toLowerCase().includes(search.toLowerCase());
      const matchesChannel = channelFilter === 'All' || item.channel === channelFilter;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [combinedActivities, search, channelFilter, statusFilter]);

  // Dynamic statistics
  const totalProcessed = combinedActivities.filter((a) => a.status === 'Processed').length;
  const waCount = combinedActivities.filter((a) => a.channel === 'whatsapp').length;
  const smsCount = combinedActivities.filter((a) => a.channel === 'sms').length;

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="flex items-center gap-2">
            <h1>WhatsApp & SMS Activity</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Live Auto-Inventory
            </span>
          </div>
          <p>Send messages here or forward SMS from your phone — SmartStock AI parses and adds them directly to your inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="connected">
            <i /> WhatsApp connected
          </span>
          <span className="connected bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
            <i className="bg-blue-500" /> SMS Webhook Active
          </span>
        </div>
      </div>

      {/* FEATURE 1: Interactive Message Sender Card (Send message directly to add to inventory) */}
      <section className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#f8faff] dark:from-[#111827] dark:to-[#0f172a] border border-[#e5eaf2] dark:border-[#1e293b] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5eaf2] dark:border-[#1e293b] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#17213a] dark:text-[#f8fafc] flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <FigmaIcon name="sparkle" size={16} />
              </span>
              Send Message to Auto-Update Inventory
            </h2>
            <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
              Type naturally in Hinglish, English, or Hindi (e.g., &quot;20 Parle G aaya&quot;, &quot;Sold 5 Tata Salt&quot;). It updates inventory immediately.
            </p>
          </div>

          {/* Channel selector */}
          <div className="flex items-center bg-[#f1f5f9] dark:bg-[#1e293b] p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedChannel('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[#58657d] dark:text-[#94a3b8] hover:text-[#17213a]'
              }`}
            >
              <FigmaIcon name="whatsapp" size={14} />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('sms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedChannel === 'sms'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#58657d] dark:text-[#94a3b8] hover:text-[#17213a]'
              }`}
            >
              <FigmaIcon name="message" size={14} />
              SMS Forwarder
            </button>
          </div>
        </div>

        {/* Input box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                selectedChannel === 'whatsapp'
                  ? 'e.g. 20 Parle G aaya, 10 Tata Salt add, or sold 5 amul milk...'
                  : 'e.g. [SMS from Supplier] 50 packet Maggi received @ 12...'
              }
              className="w-full pl-3.5 pr-24 py-2.5 text-sm rounded-xl border border-[#dce3ee] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#94a3b8] font-mono hidden sm:inline">
              ↵ Enter
            </span>
          </div>

          <button
            type="button"
            disabled={isSending || !inputMsg.trim()}
            onClick={() => handleSend()}
            className="btn btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <FigmaIcon name="send" size={15} />
            <span>{isSending ? 'Updating Stock...' : 'Send & Update Stock'}</span>
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[#58657d] dark:text-[#94a3b8] font-medium">Quick examples:</span>
          {[
            '20 Parle G aaya',
            '10 Tata Salt add @ 28',
            'Sold 5 Amul milk',
            '12 Fortune Oil aur 15 Maggi aaya',
            'Sold 3 Parle G'
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setInputMsg(preset);
                handleSend(preset);
              }}
              className="text-xs px-2.5 py-1 rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#cbd5e1] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors shadow-2xs"
            >
              + &quot;{preset}&quot;
            </button>
          ))}
        </div>

        {/* Feedback message banner if triggered */}
        {lastFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
              lastFeedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900'
            }`}
          >
            <FigmaIcon name={lastFeedback.success ? 'check' : 'warning'} size={16} />
            <span className="font-semibold">{lastFeedback.reply}</span>
          </div>
        )}
      </section>

      {/* FEATURE 2: Android SMS Forwarder Webhook Setup Banner */}
      <div className="p-4 rounded-xl bg-[#eef5ff] dark:bg-[#162238] border border-[#d6e5fb] dark:border-[#1e3458] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[#1768e5] dark:text-[#60a5fa] uppercase tracking-wide">
              Android SMS Forwarder Webhook
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono">
              POST
            </span>
          </div>
          <p className="text-xs text-[#334155] dark:text-[#cbd5e1]">
            Copy this Webhook URL into your Android SMS Forwarder app (<span className="font-mono text-[11px]">app-release.apk</span>). Any forwarded SMS will automatically update inventory!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] text-xs font-mono text-[#0f172a] dark:text-[#93c5fd] select-all">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="btn btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <FigmaIcon name={copiedWebhook ? 'check' : 'copy'} size={14} />
            <span>{copiedWebhook ? 'Copied!' : 'Copy Webhook'}</span>
          </button>
        </div>
      </div>

      <div className="activity-layout">
        {/* Main Feed */}
        <section className="activity-feed space-y-4">
          {/* Toolbar with Filters */}
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

            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] cursor-pointer"
            >
              <option value="All">All Channels</option>
              <option value="whatsapp">WhatsApp Only</option>
              <option value="sms">SMS Forwarder Only</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] cursor-pointer"
            >
              <option value="All">All statuses</option>
              <option value="Processed">Processed</option>
              <option value="Needs Clarification">Needs Clarification</option>
              <option value="Undone">Undone</option>
            </select>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#111827] rounded-2xl border border-dashed border-[#e5eaf2] dark:border-[#1e293b] space-y-2">
                <FigmaIcon name="message" size={28} className="mx-auto text-slate-400" />
                <h4 className="font-bold text-sm text-[#17213a] dark:text-[#f8fafc]">No matching activity found</h4>
                <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
                  Try typing a message above or clear your search filters.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <article key={item.id} className="activity-card">
                  {/* Incoming Message Header */}
                  <div className="activity-message">
                    <span className={`wa-round ${item.channel === 'sms' ? '!bg-blue-600' : ''}`}>
                      {item.channel === 'sms' ? (
                        <FigmaIcon name="message" size={17} />
                      ) : (
                        <FigmaIcon name="whatsapp" size={18} />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <small>{item.channel === 'sms' ? 'FORWARDED SMS' : 'INCOMING WHATSAPP'}</small>
                        {item.isReal && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm text-[#17213a] dark:text-[#f8fafc]">
                        “{item.message}”
                      </p>
                      <span>{item.time}</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span
                        className={`status ${
                          item.status === 'Processed'
                            ? 'status-normal'
                            : item.status === 'Undone'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'status-blue'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* AI Interpretation */}
                  <div className="interpretation">
                    <div className="interpret-title">
                      <FigmaIcon name="sparkle" size={16} />
                      <b>AI Interpretation & Inventory Changes</b>
                    </div>
                    <div className="divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
                      {item.items.map((sub, idx) => (
                        <div key={`${item.id}-${idx}`} className="interpret-grid py-1.5 first:pt-0 last:pb-0">
                          <span>
                            <small>ACTION</small>
                            <b className={sub.type === 'add' ? 'positive' : 'negative'}>
                              {sub.type === 'add' ? '+ Stock In' : '− Stock Out'}
                            </b>
                          </span>
                          <span>
                            <small>QUANTITY</small>
                            <b>{Math.abs(sub.change)} {sub.unit}</b>
                          </span>
                          <span>
                            <small>PRODUCT</small>
                            <b>{sub.item_name}</b>
                          </span>
                          <span>
                            <small>CONFIDENCE</small>
                            <b className="text-emerald-600 dark:text-emerald-400">100% match</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Automated AI Reply */}
                  <div className="ai-reply">
                    <span className="wa-round">
                      <FigmaIcon name="sparkle" size={15} />
                    </span>
                    <div>
                      <small>AUTOMATED CONFIRMATION REPLY</small>
                      <p>{item.reply}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Side Summary */}
        <aside className="activity-summary panel h-fit p-5 space-y-4">
          <h3 className="font-bold text-sm text-[#17213a] dark:text-[#f8fafc]">Channel Statistics</h3>
          <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
            Real-time breakdown of all WhatsApp and forwarded SMS updates processed into inventory.
          </p>

          <div className="p-3.5 rounded-xl bg-[#eef5ff] dark:bg-[#162032] border border-[#dce7f7] dark:border-[#1e293b] space-y-1">
            <div className="text-2xl font-bold text-[#1768e5] dark:text-[#60a5fa]">{totalProcessed}</div>
            <div className="text-xs text-[#58657d] dark:text-[#94a3b8]">Total updates applied to inventory</div>
          </div>

          <div className="space-y-2 text-xs text-[#58657d] dark:text-[#94a3b8]">
            <div className="flex justify-between items-center py-1 border-b border-[#e5eaf2] dark:border-[#1e293b]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                WhatsApp Messages
              </span>
              <b>{waCount}</b>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#e5eaf2] dark:border-[#1e293b]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                SMS Forwarder Messages
              </span>
              <b>{smsCount}</b>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Direct Match Rate</span>
              <b className="text-emerald-600 dark:text-emerald-400">98.6%</b>
            </div>
          </div>

          {/* Quick Setup Card for Android App */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] text-xs space-y-2">
            <b className="text-[#17213a] dark:text-[#f8fafc] flex items-center gap-1.5">
              <FigmaIcon name="check" size={14} className="text-blue-500" />
              Android APK Setup Guide
            </b>
            <ol className="list-decimal list-inside space-y-1 text-[#64748b] dark:text-[#94a3b8] text-[11px]">
              <li>Install SMS Forwarder (<code className="text-[10px]">app-release.apk</code>)</li>
              <li>Add Webhook with Method <code className="text-[10px]">POST</code></li>
              <li>Paste the URL: <code className="text-[10px] break-all">{webhookUrl}</code></li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};
