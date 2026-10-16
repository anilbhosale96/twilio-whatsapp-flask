import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaProductDetailProps {
  item: InventoryItem;
  onBack: () => void;
  onPatchItem: (id: number, data: { qty?: number; threshold?: number; price?: number; reordered?: boolean }) => Promise<boolean>;
}

export const FigmaProductDetail: React.FC<FigmaProductDetailProps> = ({
  item,
  onBack,
  onPatchItem
}) => {
  const [currentQty, setCurrentQty] = useState(item.qty);
  const [editThreshold, setEditThreshold] = useState(item.threshold);
  const [editPrice, setEditPrice] = useState(item.price || 10);
  const [isEditingValues, setIsEditingValues] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    setCurrentQty(item.qty);
    setEditThreshold(item.threshold);
    setEditPrice(item.price || 10);
  }, [item.qty, item.threshold, item.price]);

  const handleAdjustStock = async (delta: number) => {
    const nextQty = Math.max(0, currentQty + delta);
    setCurrentQty(nextQty);
    setIsSaving(true);
    try {
      const ok = await onPatchItem(item.id, { qty: nextQty });
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const ok = await onPatchItem(item.id, {
        qty: Number(currentQty),
        threshold: Number(editThreshold),
        price: Number(editPrice)
      });
      if (ok) {
        setIsEditingValues(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isLow = currentQty <= item.threshold;
  const isCritical = currentQty <= Math.max(1, Math.floor(item.threshold / 2));
  const status = isCritical ? 'Critical' : isLow ? 'Low Stock' : 'Normal';
  const statusColor = isCritical ? 'critical' : isLow ? 'low' : 'normal';

  const priceVal = editPrice || item.price || 10;
  const valuation = currentQty * priceVal;

  const initials = item.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="page space-y-6">
      {/* Back Link */}
      <button className="back-link cursor-pointer flex items-center space-x-1" onClick={onBack}>
        <span>‹ Back to inventory</span>
      </button>

      {/* Product Title Header */}
      <div className="product-title flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <span className="product-avatar amber">{initials}</span>
          <div>
            <h1 className="text-2xl font-bold text-[#17213a] dark:text-[#f8fafc]">{item.name}</h1>
            <p className="text-xs text-[#58657d] dark:text-[#94a3b8]">
              Standard SKU #{item.id.toString().padStart(4, '0')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`status status-${statusColor}`}>{status}</span>
          <button
            type="button"
            className="btn btn-secondary cursor-pointer"
            onClick={() => onPatchItem(item.id, { reordered: true })}
          >
            <FigmaIcon name="download" size={15} />
            <span>Generate Reorder PO</span>
          </button>
        </div>
      </div>

      {/* Product Detail Grid */}
      <div className="product-detail-grid">
        {/* Stock Overview Panel */}
        <section className="panel stock-overview">
          <div className="panel-head flex items-center justify-between">
            <h3>Stock overview</h3>
            {isSaving && <span className="text-xs text-blue-500 animate-pulse">Saving changes...</span>}
            {saveSuccess && <span className="text-xs text-emerald-600 font-medium">✓ Saved & Synced</span>}
          </div>

          <div className="big-stock">
            <small>CURRENT STOCK</small>
            <b>
              {currentQty} <em>{item.unit}</em>
            </b>
            <span>
              <FigmaIcon name="trend" size={15} />
              {currentQty} {item.unit} in store
            </span>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="p-4 border-t border-b border-[#e5eaf2] dark:border-[#1e293b] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">Quick Adjust:</span>
              <button
                onClick={() => handleAdjustStock(1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#eef5ff] dark:bg-[#172544] text-[#1768e5] dark:text-[#60a5fa] hover:opacity-90 cursor-pointer"
              >
                +1
              </button>
              <button
                onClick={() => handleAdjustStock(5)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#eef5ff] dark:bg-[#172544] text-[#1768e5] dark:text-[#60a5fa] hover:opacity-90 cursor-pointer"
              >
                +5
              </button>
              <button
                onClick={() => handleAdjustStock(10)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#eef5ff] dark:bg-[#172544] text-[#1768e5] dark:text-[#60a5fa] hover:opacity-90 cursor-pointer"
              >
                +10
              </button>
              <button
                onClick={() => handleAdjustStock(-1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#fee2e2] dark:bg-[#450a0a] text-[#dc2626] dark:text-[#f87171] hover:opacity-90 cursor-pointer"
              >
                −1
              </button>
              <button
                onClick={() => handleAdjustStock(-5)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[#fee2e2] dark:bg-[#450a0a] text-[#dc2626] dark:text-[#f87171] hover:opacity-90 cursor-pointer"
              >
                −5
              </button>
            </div>

            <button
              onClick={() => setIsEditingValues(!isEditingValues)}
              className="text-xs px-2.5 py-1 rounded border border-[#e5eaf2] dark:border-[#334155] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
            >
              {isEditingValues ? 'Cancel' : 'Edit Values'}
            </button>
          </div>

          {isEditingValues ? (
            <div className="p-4 space-y-3 bg-[#f8fafc] dark:bg-[#0d1526]/40 border-b border-[#e5eaf2] dark:border-[#1e293b]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#58657d] dark:text-[#94a3b8] block mb-1">
                    Current Quantity ({item.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#58657d] dark:text-[#94a3b8] block mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#58657d] dark:text-[#94a3b8] block mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveDetails}
                  className="btn btn-primary text-xs px-4 py-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FigmaIcon name="check" size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Product Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="detail-values">
              <div>
                <small>Minimum stock</small>
                <b>
                  {item.threshold} {item.unit}
                </b>
              </div>
              <div>
                <small>Purchase price</small>
                <b>₹{(priceVal * 0.85).toFixed(2)}</b>
              </div>
              <div>
                <small>Selling price</small>
                <b>₹{priceVal.toFixed(2)}</b>
              </div>
              <div>
                <small>Stock value</small>
                <b>₹{valuation.toFixed(2)}</b>
              </div>
            </div>
          )}
        </section>

        {/* Product Movement Chart Panel */}
        <section className="panel product-chart">
          <div className="panel-head">
            <div>
              <h3>Stock movement</h3>
              <p>Last 7 days</p>
            </div>
          </div>
          <div className="line-chart">
            <div className="y-labels">
              <span>{Math.max(50, currentQty * 2)}</span>
              <span>{Math.max(35, Math.round(currentQty * 1.5))}</span>
              <span>{currentQty}</span>
              <span>{Math.round(currentQty / 2)}</span>
              <span>0</span>
            </div>
            <svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label="Inventory movement trend">
              <defs>
                <linearGradient id="areaProduct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42 L700 190 L0 190Z"
                fill="url(#areaProduct)"
              />
              <path
                d="M0 145 C60 130 75 110 125 119 S205 70 260 91 S340 112 390 72 S470 52 520 71 S605 25 700 42"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
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
      </div>

      {/* Transaction History for this item */}
      <section className="panel transaction-history">
        <div className="panel-head">
          <div>
            <h3>Transaction history</h3>
            <p>All recorded updates for {item.name}</p>
          </div>
          <button className="btn btn-secondary cursor-pointer">
            <FigmaIcon name="download" size={15} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="divide-y divide-[#e5eaf2] dark:divide-[#1e293b]">
          <div className="history-row">
            <span className="history-icon in">
              <FigmaIcon name="download" size={16} />
            </span>
            <div>
              <b>Received</b>
              <small>WhatsApp update</small>
            </div>
            <strong className="positive">+10 {item.unit}</strong>
            <span>Today, 9:42 AM</span>
          </div>

          <div className="history-row">
            <span className="history-icon out">
              <FigmaIcon name="arrow" size={16} />
            </span>
            <div>
              <b>Sold</b>
              <small>Counter sales</small>
            </div>
            <strong className="negative">−5 {item.unit}</strong>
            <span>Yesterday, 6:21 PM</span>
          </div>
        </div>
      </section>
    </div>
  );
};

