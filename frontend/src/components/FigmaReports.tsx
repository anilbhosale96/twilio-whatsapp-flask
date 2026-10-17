import React, { useState, useMemo } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { ReportsData } from '../types';

interface FigmaReportsProps {
  reports: ReportsData | null;
  currentRange: string;
  onSelectRange: (range: string) => void;
}

export const FigmaReports: React.FC<FigmaReportsProps> = ({
  reports,
  currentRange,
  onSelectRange
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'products'>('daily');

  const handlePrint = () => {
    window.print();
  };

  const rangeTitle = currentRange === 'today'
    ? 'Today’s Inventory Report'
    : currentRange === '7d'
    ? 'Last 7 Days Inventory Report'
    : 'Last 30 Days Inventory Report';

  const rangeSubtitle = useMemo(() => {
    if (reports?.date_range_label) {
      return reports.date_range_label;
    }
    const today = new Date();
    if (currentRange === 'today') {
      return today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const days = currentRange === '7d' ? 6 : 29;
    const start = new Date();
    start.setDate(today.getDate() - days);
    const startStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} — ${endStr} (${currentRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`;
  }, [currentRange, reports?.date_range_label]);

  const dailyReports = reports?.daily_movement || [];

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Create and share clear inventory summaries.</p>
        </div>
        <button className="btn btn-primary cursor-pointer" onClick={handlePrint}>
          <FigmaIcon name="download" size={17} />
          <span>Generate Report PDF</span>
        </button>
      </div>

      {/* Report Hero Panel */}
      <section className="report-hero panel">
        <div className="report-head">
          <div className="flex items-center space-x-3">
            <span>
              <FigmaIcon name="report" size={22} />
            </span>
            <div>
              <small>PERIOD SUMMARY</small>
              <h2>{rangeTitle}</h2>
              <p>{rangeSubtitle}</p>
            </div>
          </div>
          <span className="status status-normal">
            <span /> Ready
          </span>
        </div>

        <div className="report-numbers">
          <div>
            <span className="tone-green">
              <FigmaIcon name="download" size={18} />
            </span>
            <small>TOTAL UNITS SOLD</small>
            <b>{reports ? reports.total_units_sold : 0}</b>
          </div>

          <div>
            <span className="tone-blue">
              <FigmaIcon name="arrow" size={18} />
            </span>
            <small>ITEMS TRACKED</small>
            <b>{reports ? reports.item_count : 0}</b>
          </div>

          <div>
            <span className="tone-amber">
              <FigmaIcon name="warning" size={18} />
            </span>
            <small>REVENUE</small>
            <b>{reports ? reports.total_revenue_formatted : '₹0.00'}</b>
          </div>

          <div>
            <span className="tone-red">
              <FigmaIcon name="warning" size={18} />
            </span>
            <small>CRITICAL ITEMS</small>
            <b>{reports?.critical_count ?? 0}</b>
          </div>
        </div>
      </section>

      {/* Past Reports List */}
      <section className="panel p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc]">
              {viewMode === 'daily'
                ? currentRange === 'today' ? 'Today’s Daily Report' : `Past Daily Reports (${currentRange === '7d' ? '7 Days' : '30 Days'})`
                : 'Product Sales Breakdown'}
            </h3>
            <p className="text-xs text-[#58657d] dark:text-[#94a3b8] mt-0.5">
              {viewMode === 'daily'
                ? `Individual daily movement & sales reports for ${rangeSubtitle}`
                : `Quantity and revenue breakdown per product`}
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* View switcher */}
            <div className="flex bg-[#f1f5f9] dark:bg-[#1e293b] p-1 rounded-lg border border-[#e5eaf2] dark:border-[#334155] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-[#0f172a] text-[#17213a] dark:text-[#f8fafc] shadow-xs'
                    : 'text-[#58657d] dark:text-[#94a3b8]'
                }`}
              >
                Daily Reports
              </button>
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  viewMode === 'products'
                    ? 'bg-white dark:bg-[#0f172a] text-[#17213a] dark:text-[#f8fafc] shadow-xs'
                    : 'text-[#58657d] dark:text-[#94a3b8]'
                }`}
              >
                Products Breakdown
              </button>
            </div>

            {/* Range selector */}
            <div className="flex space-x-1.5">
              {['today', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectRange(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                    currentRange === r
                      ? 'bg-[#1768e5] text-white border-[#1768e5]'
                      : 'border-[#e5eaf2] dark:border-[#334155] text-[#58657d] dark:text-[#94a3b8] hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
          {viewMode === 'daily' ? (
            dailyReports.length > 0 ? (
              dailyReports.map((day, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between text-xs hover:bg-[#f8fafc] dark:hover:bg-[#162032] px-2 rounded-lg transition-colors">
                  <div>
                    <b className="text-sm text-[#17213a] dark:text-[#f8fafc]">
                      {day.display_title || day.date}
                    </b>
                    <p className="text-[#58657d] dark:text-[#94a3b8] mt-0.5">
                      {day.total_moved > 0
                        ? `${day.total_moved} units moved (+${day.stock_in} in, −${day.stock_out} out)`
                        : 'No stock movement recorded on this day'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {day.revenue_formatted || (day.revenue ? `₹${day.revenue.toFixed(2)}` : '₹0.00')}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-2.5 py-1 rounded border border-[#e5eaf2] dark:border-[#334155] text-[#1768e5] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-[#58657d] dark:text-[#94a3b8] space-y-1">
                <p className="font-semibold">No daily activity recorded for this period.</p>
              </div>
            )
          ) : reports && reports.items && reports.items.length > 0 ? (
            reports.items.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between text-xs hover:bg-[#f8fafc] dark:hover:bg-[#162032] px-2 rounded-lg transition-colors">
                <div>
                  <b className="text-sm text-[#17213a] dark:text-[#f8fafc]">{item.name}</b>
                  <p className="text-[#58657d] dark:text-[#94a3b8]">
                    {item.units_sold} {item.unit} sold
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{item.revenue.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-2.5 py-1 rounded border border-[#e5eaf2] dark:border-[#334155] text-[#1768e5] dark:text-[#60a5fa] hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-xs text-[#58657d] dark:text-[#94a3b8] space-y-1">
              <p className="font-semibold">No sales recorded for this period.</p>
              <p className="text-[11px] opacity-75">
                Record sales via WhatsApp (e.g., '2 bread becha @20') to view sales reports here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
