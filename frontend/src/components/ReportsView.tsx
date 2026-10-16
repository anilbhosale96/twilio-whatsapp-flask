import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReportsData } from '../types';

interface ReportsViewProps {
  reports: ReportsData | null;
  currentRange: string;
  onSelectRange: (range: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  currentRange,
  onSelectRange
}) => {
  const ranges = [
    { id: 'today', label: 'Today (IST)' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
  ];

  return (
    <div className="space-y-6">
      {/* Range Switcher & Summary Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 p-1 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827]">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRange(r.id)}
              className={`h-9 px-3.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                currentRange === r.id
                  ? 'bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Total Revenue
          </span>
          <div className="text-3xl font-bold tabular-nums text-[#16A34A] dark:text-[#22C55E] mt-1">
            {reports ? reports.total_revenue_formatted : 'Rs. 0'}
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Period: {currentRange.toUpperCase()}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Units Sold
          </span>
          <div className="text-3xl font-bold tabular-nums text-[#0F172A] dark:text-[#F1F5F9] mt-1">
            {reports ? `${reports.total_units_sold} units` : '0 units'}
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Across {reports?.item_count || 0} unique items
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Active Selling SKUs
          </span>
          <div className="text-3xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-1">
            {reports ? reports.item_count : 0}
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Items sold in this timeframe
          </p>
        </div>
      </div>

      {/* Top vs Slowest Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Sellers */}
        <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp size={18} strokeWidth={1.5} className="text-[#16A34A]" />
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Top Revenue Generators
            </h3>
          </div>
          {!reports || reports.top_items.length === 0 ? (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">No sales in this period.</p>
          ) : (
            <div className="space-y-3">
              {reports.top_items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#F1F5F9] dark:border-[#1E293B] last:border-none">
                  <div>
                    <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] capitalize">
                      {it.name}
                    </span>
                    <span className="text-[#64748B] dark:text-[#94A3B8] ml-2">
                      ({it.units_sold} {it.unit})
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-[#16A34A] dark:text-[#22C55E]">
                    Rs. {it.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slowest Sellers */}
        <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown size={18} strokeWidth={1.5} className="text-[#D97706]" />
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
              Low Velocity Items
            </h3>
          </div>
          {!reports || reports.slowest_items.length === 0 ? (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">No item data available.</p>
          ) : (
            <div className="space-y-3">
              {reports.slowest_items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#F1F5F9] dark:border-[#1E293B] last:border-none">
                  <div>
                    <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] capitalize">
                      {it.name}
                    </span>
                    <span className="text-[#64748B] dark:text-[#94A3B8] ml-2">
                      ({it.units_sold} {it.unit})
                    </span>
                  </div>
                  <span className="font-medium tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                    Rs. {it.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

