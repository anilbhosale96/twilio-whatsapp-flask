import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import { FigmaQuickUpdate } from './FigmaQuickUpdate';
import { InteractiveMovementChart } from './InteractiveMovementChart';
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
  onOpenBillModal?: () => void;
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
  latestMessageText,
  onOpenBillModal
}) => {
  const lowItems = inventory.filter((item) => item.qty <= item.threshold);



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
        onOpenBillModal={onOpenBillModal}
      />

      {/* Dashboard Grid: Movement Chart & Low Stock */}
      <div className="dashboard-grid">
        {/* Inventory Movement Dynamic Chart */}
        <section className="panel movement-panel p-5">
          <InteractiveMovementChart
            transactions={transactions}
            inventory={inventory}
            defaultPeriod="7d"
            title="Inventory movement"
            subtitle="Interactive stock flow (hover points for details)"
          />
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

