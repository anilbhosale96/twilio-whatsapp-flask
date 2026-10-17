import React, { useState, useMemo } from 'react';
import { FigmaIcon } from './FigmaIcon';
import { FigmaQuickUpdate } from './FigmaQuickUpdate';
import type { SummaryData, InventoryItem, TransactionItem } from '../types';
import type { FigmaPage } from './FigmaSidebar';

interface FigmaDashboardProps {
  summary: SummaryData | null;
  inventory: InventoryItem[];
  transactions?: TransactionItem[];
  shopName?: string | null;
  ownerName?: string | null;
  onGoToPage: (page: FigmaPage) => void;
  onSelectProduct: (item: InventoryItem) => void;
  onConfirmUpdate: (message?: string) => void;
  onSendMessage: (msg: string) => Promise<boolean>;
  latestMessageText?: string;
}

function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function generateAreaPath(points: { x: number; y: number }[], baselineY = 160): string {
  if (points.length < 2) return '';
  const curve = generateSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}

export const FigmaDashboard: React.FC<FigmaDashboardProps> = ({
  summary,
  inventory,
  transactions,
  shopName,
  ownerName,
  onGoToPage,
  onSelectProduct,
  onConfirmUpdate,
  onSendMessage,
  latestMessageText
}) => {
  const lowItems = inventory.filter((item) => item.qty <= item.threshold);
  const [movementPeriod, setMovementPeriod] = useState<'7d' | '30d'>('7d');

  const { pointsIn, pointsOut, totalStockIn, totalStockOut, yLabels, xLabels } = useMemo(() => {
    const numDays = movementPeriod === '7d' ? 7 : 30;

    // Group transactions by date key (YYYY-MM-DD)
    const dateMap: Record<string, { in: number; out: number }> = {};
    (transactions || []).forEach((tx) => {
      if (tx.undone) return;
      const d = new Date(tx.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dateMap[key]) {
        dateMap[key] = { in: 0, out: 0 };
      }
      const val = Math.abs(tx.change);
      if (tx.type === 'add' || tx.change > 0) {
        dateMap[key].in += val;
      } else {
        dateMap[key].out += val;
      }
    });

    const buckets: { dateKey: string; label: string; fullDate: string }[] = [];
    const today = new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = numDays === 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const fullDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      buckets.push({ dateKey, label, fullDate });
    }

    let sumIn = 0;
    let sumOut = 0;
    let maxVal = 0;

    const width = 640;
    const startX = 30;

    const rawIn: { x: number; val: number; label: string; fullDate: string }[] = [];
    const rawOut: { x: number; val: number; label: string; fullDate: string }[] = [];

    buckets.forEach((b, idx) => {
      const data = dateMap[b.dateKey] || { in: 0, out: 0 };
      sumIn += data.in;
      sumOut += data.out;
      if (data.in > maxVal) maxVal = data.in;
      if (data.out > maxVal) maxVal = data.out;

      const x = startX + (idx / (buckets.length - 1)) * width;
      rawIn.push({ x, val: data.in, label: b.label, fullDate: b.fullDate });
      rawOut.push({ x, val: data.out, label: b.label, fullDate: b.fullDate });
    });

    const computedMaxScale = maxVal === 0 ? 10 : Math.ceil(maxVal / 4) * 4;
    const chartHeight = 135;
    const baselineY = 160;

    const coordsIn = rawIn.map((p) => ({
      x: p.x,
      y: maxVal === 0 ? baselineY : baselineY - (p.val / computedMaxScale) * chartHeight,
      val: p.val,
      label: p.label,
      fullDate: p.fullDate
    }));

    const coordsOut = rawOut.map((p) => ({
      x: p.x,
      y: maxVal === 0 ? baselineY : baselineY - (p.val / computedMaxScale) * chartHeight,
      val: p.val,
      label: p.label,
      fullDate: p.fullDate
    }));

    const computedYLabels = [
      computedMaxScale,
      Math.round(computedMaxScale * 0.75),
      Math.round(computedMaxScale * 0.5),
      Math.round(computedMaxScale * 0.25),
      0
    ];

    const computedXLabels = numDays === 7
      ? buckets.map((b) => b.label)
      : [
          buckets[0].label,
          buckets[Math.floor(buckets.length * 0.2)].label,
          buckets[Math.floor(buckets.length * 0.4)].label,
          buckets[Math.floor(buckets.length * 0.6)].label,
          buckets[Math.floor(buckets.length * 0.8)].label,
          buckets[buckets.length - 1].label
        ];

    return {
      pointsIn: coordsIn,
      pointsOut: coordsOut,
      totalStockIn: sumIn,
      totalStockOut: sumOut,
      yLabels: computedYLabels,
      xLabels: computedXLabels
    };
  }, [movementPeriod, transactions]);

  return (
    <div className="page dashboard-page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Good morning, {ownerName || shopName || "Shopkeeper"}</h1>
          <p>Here’s what’s happening with your inventory at <b>{shopName || "your shop"}</b> today.</p>
        </div>
        <div className="date-chip">
          <FigmaIcon name="calendar" size={17} />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stats-grid">
        {/* Total Products */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Inventory')}>
          <div className="stat-icon tone-blue">
            <FigmaIcon name="box" size={20} />
          </div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{summary ? summary.total_items : inventory.length}</div>
          <div className="stat-note">Live in inventory</div>
        </article>

        {/* Total Stock */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Inventory')}>
          <div className="stat-icon tone-indigo">
            <FigmaIcon name="inventory" size={20} />
          </div>
          <div className="stat-label">Total Stock</div>
          <div className="stat-value">
            {inventory.reduce((sum, i) => sum + Math.max(0, i.qty), 0)}
          </div>
          <div className="stat-note">Units across all items</div>
        </article>

        {/* Low Stock Alerts */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Alerts')}>
          <div className="stat-icon tone-amber">
            <FigmaIcon name="warning" size={20} />
          </div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value">{summary ? summary.alerts_count : lowItems.length}</div>
          <div className="stat-note">{lowItems.length} items need reorder</div>
        </article>

        {/* Today's Updates */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Transactions')}>
          <div className="stat-icon tone-green">
            <FigmaIcon name="trend" size={20} />
          </div>
          <div className="stat-label">Today’s Updates</div>
          <div className="stat-value">
            {summary ? (summary.today_updates_count ?? summary.sales_today_units ?? 0) : 0}
          </div>
          <div className="stat-note">
            {summary && summary.sales_today_units > 0
              ? `${summary.sales_today_units} units moved today`
              : 'Units sold / updated today'}
          </div>
        </article>
      </div>

      {/* Hero WhatsApp Quick Update Card */}
      <FigmaQuickUpdate
        inventory={inventory}
        onConfirm={onConfirmUpdate}
        onSendMessage={onSendMessage}
        latestMessageText={latestMessageText}
      />

      {/* Dashboard Grid: Movement Chart & Low Stock */}
      <div className="dashboard-grid">
        {/* Inventory Movement Dynamic Chart */}
        <section className="panel movement-panel">
          <div className="panel-head">
            <div>
              <h3>Inventory movement</h3>
              <p>Stock in and out over the {movementPeriod === '7d' ? 'last 7 days' : 'last 30 days'}</p>
            </div>
            <select
              aria-label="Chart period"
              value={movementPeriod}
              onChange={(e) => setMovementPeriod(e.target.value as '7d' | '30d')}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div className="chart-legend">
            <span>
              <i className="blue-dot" />
              Stock In <b>+{totalStockIn}</b>
            </span>
            <span>
              <i className="gray-dot" />
              Stock Out <b>−{totalStockOut}</b>
            </span>
          </div>

          <div className="line-chart">
            <div className="y-labels">
              {yLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
            <svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Inventory movement trend">
              <defs>
                <linearGradient id="areaDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[25, 58.75, 92.5, 126.25, 160].map((gridY, idx) => (
                <line
                  key={idx}
                  x1="30"
                  y1={gridY}
                  x2="670"
                  y2={gridY}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.35}
                />
              ))}

              {/* Area fill for Stock In */}
              {totalStockIn > 0 && (
                <path d={generateAreaPath(pointsIn, 160)} fill="url(#areaDash)" />
              )}

              {/* Stock In curve (Blue) */}
              <path
                d={generateSmoothPath(pointsIn)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />

              {/* Stock Out curve (Slate dashed) */}
              <path
                d={generateSmoothPath(pointsOut)}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                vectorEffect="non-scaling-stroke"
              />

              {/* Circles for Stock In */}
              <g fill="#fff" stroke="#2563eb" strokeWidth="2.5">
                {pointsIn.map((p, idx) => (
                  <circle
                    key={`in-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.val > 0 ? 4 : 2}
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${p.fullDate}: +${p.val} Stock In`}</title>
                  </circle>
                ))}
              </g>

              {/* Circles for Stock Out */}
              <g fill="#fff" stroke="#94a3b8" strokeWidth="2">
                {pointsOut.map((p, idx) => (
                  <circle
                    key={`out-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.val > 0 ? 3.5 : 2}
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${p.fullDate}: -${p.val} Stock Out`}</title>
                  </circle>
                ))}
              </g>
            </svg>
            <div className="x-labels">
              {xLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Needs Attention Panel */}
        <section className="panel low-panel">
          <div className="panel-head">
            <div>
              <h3>Needs attention</h3>
              <p>Low and critical stock</p>
            </div>
            <button className="text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer" onClick={() => onGoToPage('Alerts')}>
              View all
            </button>
          </div>

          <div className="divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
            {lowItems.slice(0, 4).map((item) => {
              const initials = item.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();
              return (
                <div
                  key={item.id}
                  className="low-row cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-[#162032] transition-colors"
                  onClick={() => onSelectProduct(item)}
                >
                  <span className="product-avatar amber">{initials}</span>
                  <div>
                    <b>{item.name}</b>
                    <small>
                      {item.qty} {item.unit.toLowerCase()} left (min: {item.threshold})
                    </small>
                  </div>
                  <span className="status status-low">Low Stock</span>
                </div>
              );
            })}
          </div>

          <button
            className="reorder-btn cursor-pointer"
            onClick={() => onGoToPage('Alerts')}
          >
            <span>Review all {lowItems.length} alerts</span>
            <FigmaIcon name="arrow" size={15} />
          </button>
        </section>
      </div>

      {/* Recent Updates Panel */}
      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <h3>Recent updates</h3>
            <p>Latest inventory changes across your shop</p>
          </div>
          <button
            className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
            onClick={() => onGoToPage('Transactions')}
          >
            <span>View all transactions</span>
            <FigmaIcon name="arrow" size={14} />
          </button>
        </div>

        <div className="recent-table">
          <div className="tr table-header">
            <span>PRODUCT</span>
            <span>CHANGE</span>
            <span>SOURCE</span>
            <span>UPDATED BY</span>
            <span>TIME</span>
          </div>

          {transactions && transactions.length > 0 ? (
            transactions.slice(0, 5).map((tx, idx) => {
              const initials = tx.item_name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();
              const tone = idx % 2 === 0 ? 'amber' : 'blue';
              const isPositive = tx.change > 0;
              const isWhatsApp = !tx.raw_text.toLowerCase().includes('manual');
              const matchedItem = inventory.find(
                (i) => i.name.toLowerCase() === tx.item_name.toLowerCase()
              );

              return (
                <div
                  key={tx.id}
                  className="tr cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-[#162032]"
                  onClick={() => matchedItem && onSelectProduct(matchedItem)}
                >
                  <span className="product-cell">
                    <i className={`product-avatar ${tone}`}>{initials}</i>
                    <b>
                      {tx.item_name}
                      <small>
                        {tx.raw_text.length > 32
                          ? tx.raw_text.slice(0, 30) + '...'
                          : tx.raw_text}
                      </small>
                    </b>
                  </span>
                  <span className={isPositive ? 'positive' : 'negative'}>
                    {isPositive ? `+${tx.change}` : tx.change} {tx.unit}
                  </span>
                  <span>
                    <i className={`source-icon ${isWhatsApp ? 'wa' : ''}`}>
                      <FigmaIcon name={isWhatsApp ? 'whatsapp' : 'trend'} size={14} />
                    </i>
                    {isWhatsApp ? 'WhatsApp' : 'Manual'}
                  </span>
                  <span>SmartStock AI</span>
                  <span>
                    {new Date(tx.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-[#58657d] dark:text-[#94a3b8]">
              No updates recorded yet. Send a WhatsApp message or update items above.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

