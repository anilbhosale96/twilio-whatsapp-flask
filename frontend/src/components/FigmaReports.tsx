import React from 'react';
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
  const handlePrint = () => {
    window.print();
  };

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
              <small>DAILY SUMMARY</small>
              <h2>Today’s Inventory Report</h2>
              <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
            <b>{reports?.total_units_sold || 42}</b>
          </div>

          <div>
            <span className="tone-blue">
              <FigmaIcon name="arrow" size={18} />
            </span>
            <small>ITEMS TRACKED</small>
            <b>{reports?.item_count || 16}</b>
          </div>

          <div>
            <span className="tone-amber">
              <FigmaIcon name="warning" size={18} />
            </span>
            <small>REVENUE</small>
            <b>{reports?.total_revenue_formatted || '₹1,450.00'}</b>
          </div>

          <div>
            <span className="tone-red">
              <FigmaIcon name="warning" size={18} />
            </span>
            <small>CRITICAL ITEMS</small>
            <b>2</b>
          </div>
        </div>
      </section>

      {/* Historical Reports List */}
      <section className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc]">Past Daily Reports</h3>
          <div className="flex space-x-2">
            {['today', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => onSelectRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  currentRange === r
                    ? 'bg-[#1768e5] text-white border-[#1768e5]'
                    : 'border-[#e5eaf2] dark:border-[#334155] text-[#58657d] dark:text-[#94a3b8]'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
          {(reports?.items || [
            { name: 'Tata Salt', unit: 'packets', units_sold: 12, revenue: 300 },
            { name: 'Parle G 100g', unit: 'packets', units_sold: 25, revenue: 250 },
            { name: 'Fortune Sunlite Oil', unit: 'L', units_sold: 8, revenue: 1040 }
          ]).map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
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
          ))}
        </div>
      </section>
    </div>
  );
};

