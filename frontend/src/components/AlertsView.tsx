import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AlertsData } from '../types';

interface AlertsViewProps {
  alerts: AlertsData | null;
  onMarkReordered: (id: number, currentStatus: boolean) => Promise<boolean>;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onMarkReordered }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    if (!alerts || !alerts.copyable_reorder_message) return;
    navigator.clipboard.writeText(alerts.copyable_reorder_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Supplier Order Drafter Card */}
      <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6]" />
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              1-Click Supplier Reorder Message
            </h3>
          </div>
          <button
            onClick={handleCopyMessage}
            className="h-9 px-3.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2} />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={1.5} />
                <span>Copy WhatsApp Order</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-2">
          Ready to paste and send to your distributor or supplier on WhatsApp:
        </p>
        <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#243041] text-xs font-mono text-[#0F172A] dark:text-[#F1F5F9] whitespace-pre-line leading-relaxed">
          {alerts?.copyable_reorder_message || "All items are currently well stocked."}
        </div>
      </div>

      {/* Low Stock Items List */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={17} strokeWidth={1.5} className="text-[#D97706]" />
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Low & Negative Stock Items ({alerts?.count || 0})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#243041] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Alert Level</th>
                <th className="py-3 px-4 text-right">Suggested Order</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-center">Reorder Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#243041]">
              {!alerts || alerts.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No stock alerts. All items are above their threshold levels!
                  </td>
                </tr>
              ) : (
                alerts.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F172A] dark:text-[#F1F5F9] capitalize">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                      {item.qty} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                      {item.threshold} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                      +{item.reorder_suggested} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'negative' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626]">
                          <AlertCircle size={12} strokeWidth={2} />
                          <span>Negative</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
                          <AlertTriangle size={12} strokeWidth={2} />
                          <span>Low Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onMarkReordered(item.id, item.reordered)}
                        className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center space-x-1.5 mx-auto transition-colors cursor-pointer ${
                          item.reordered
                            ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#14532D]/40 dark:text-[#22C55E]'
                            : 'border border-[#CBD5E1] dark:border-[#475569] text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                        }`}
                      >
                        <CheckCircle2 size={13} strokeWidth={1.5} />
                        <span>{item.reordered ? 'Reordered' : 'Mark Reordered'}</span>
                      </button>
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
