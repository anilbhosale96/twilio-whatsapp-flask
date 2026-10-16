import React from 'react';
import { Package, AlertTriangle, ShoppingCart, IndianRupee } from 'lucide-react';
import type { SummaryData } from '../types';

interface SummaryCardsProps {
  summary: SummaryData | null;
  onAlertsClick: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, onAlertsClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Items */}
      <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
        <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total SKUs</span>
          <Package size={18} strokeWidth={1.5} className="text-[#0F766E] dark:text-[#14B8A6]" />
        </div>
        <div className="text-3xl font-bold tabular-nums text-[#0F172A] dark:text-[#F1F5F9]">
          {summary ? summary.total_items : '—'}
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Active products tracked
        </p>
      </div>

      {/* Card 2: Low Stock Alerts */}
      <div 
        onClick={onAlertsClick}
        className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm hover:border-[#D97706] transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
          <AlertTriangle size={18} strokeWidth={1.5} className="text-[#D97706]" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold tabular-nums text-[#D97706]">
            {summary ? summary.alerts_count : '0'}
          </span>
          {summary && summary.negative_stock_count > 0 && (
            <span className="text-xs font-medium text-[#DC2626]">
              ({summary.negative_stock_count} negative)
            </span>
          )}
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Items needing reorder
        </p>
      </div>

      {/* Card 3: Sales Today */}
      <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
        <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sales Today</span>
          <ShoppingCart size={18} strokeWidth={1.5} className="text-[#2563EB]" />
        </div>
        <div className="text-3xl font-bold tabular-nums text-[#0F172A] dark:text-[#F1F5F9]">
          {summary ? `${summary.sales_today_units} units` : '0 units'}
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Units sold since midnight IST
        </p>
      </div>

      {/* Card 4: Revenue Today */}
      <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
        <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Revenue Today</span>
          <IndianRupee size={18} strokeWidth={1.5} className="text-[#16A34A]" />
        </div>
        <div className="text-3xl font-bold tabular-nums text-[#16A34A] dark:text-[#22C55E]">
          {summary ? summary.revenue_today_formatted : 'Rs. 0'}
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Logged sales revenue
        </p>
      </div>
    </div>
  );
};
