import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import { FigmaQuickUpdate } from './FigmaQuickUpdate';
import type { SummaryData, InventoryItem, TransactionItem } from '../types';
import type { FigmaPage } from './FigmaSidebar';

interface FigmaDashboardProps {
  summary: SummaryData | null;
  inventory: InventoryItem[];
  transactions?: TransactionItem[];
  shopName?: string | null;
  onGoToPage: (page: FigmaPage) => void;
  onSelectProduct: (item: InventoryItem) => void;
  onConfirmUpdate: (message?: string) => void;
  onSendMessage: (msg: string) => Promise<boolean>;
  latestMessageText?: string;
}

export const FigmaDashboard: React.FC<FigmaDashboardProps> = ({
  summary,
  inventory,
  transactions,
  shopName,
  onGoToPage,
  onSelectProduct,
  onConfirmUpdate,
  onSendMessage,
  latestMessageText
}) => {
  const lowItems = inventory.filter((item) => item.qty <= item.threshold);

  return (
    <div className="page dashboard-page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Good morning, {shopName || "Sharma General Store"}</h1>
          <p>Here’s what’s happening with your inventory today.</p>
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
          <div className="stat-value">{summary?.total_items || inventory.length || 16}</div>
          <div className="stat-note">+4 this month</div>
        </article>

        {/* Total Stock */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Inventory')}>
          <div className="stat-icon tone-indigo">
            <FigmaIcon name="inventory" size={20} />
          </div>
          <div className="stat-label">Total Stock</div>
          <div className="stat-value">
            {inventory.reduce((sum, i) => sum + i.qty, 0) || '387'}
          </div>
          <div className="stat-note">+126 this week</div>
        </article>

        {/* Low Stock Alerts */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Alerts')}>
          <div className="stat-icon tone-amber">
            <FigmaIcon name="warning" size={20} />
          </div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-value">{summary?.alerts_count ?? lowItems.length}</div>
          <div className="stat-note">{lowItems.length} items need reorder</div>
        </article>

        {/* Today's Updates */}
        <article className="stat-card cursor-pointer" onClick={() => onGoToPage('Transactions')}>
          <div className="stat-icon tone-green">
            <FigmaIcon name="trend" size={20} />
          </div>
          <div className="stat-label">Today’s Updates</div>
          <div className="stat-value">{summary?.sales_today_units || 37}</div>
          <div className="stat-note">32 via WhatsApp</div>
        </article>
      </div>

      {/* Hero WhatsApp Quick Update Card */}
      <FigmaQuickUpdate
        onConfirm={onConfirmUpdate}
        onSendMessage={onSendMessage}
        latestMessageText={latestMessageText}
      />

      {/* Dashboard Grid: Movement Chart & Low Stock */}
      <div className="dashboard-grid">
        {/* Inventory Movement 7-Day Chart */}
        <section className="panel movement-panel">
          <div className="panel-head">
            <div>
              <h3>Inventory movement</h3>
              <p>Stock in and out over the last 7 days</p>
            </div>
            <select aria-label="Chart period" defaultValue="Last 7 days">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>

          <div className="chart-legend">
            <span>
              <i className="blue-dot" />
              Stock In <b>+342</b>
            </span>
            <span>
              <i className="gray-dot" />
              Stock Out <b>−218</b>
            </span>
          </div>

          <div className="line-chart">
            <div className="y-labels">
              <span>400</span>
              <span>300</span>
              <span>200</span>
              <span>100</span>
              <span>0</span>
            </div>
            <svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Inventory movement trend">
              <defs>
                <linearGradient id="areaDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42 L700 190 L0 190Z"
                fill="url(#areaDash)"
              />
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              <g fill="#fff" stroke="#2563eb" strokeWidth="3">
                {[
                  [0, 145],
                  [125, 119],
                  [260, 91],
                  [390, 72],
                  [520, 71],
                  [700, 42]
                ].map(([cx, cy], n) => (
                  <circle key={n} cx={cx} cy={cy} r="4" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            </svg>
            <div className="x-labels">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
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

