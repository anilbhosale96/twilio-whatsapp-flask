import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaInventoryProps {
  items: InventoryItem[];
  onSelectProduct: (item: InventoryItem) => void;
  onPatchItem: (id: number, data: { qty?: number; threshold?: number; price?: number; reordered?: boolean }) => Promise<boolean>;
}

export const FigmaInventory: React.FC<FigmaInventoryProps> = ({
  items,
  onSelectProduct,
  onPatchItem: _onPatchItem
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'low_high'>('recent');

  const filtered = items.filter((item) => {
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'low_high') {
      return a.qty - b.qty;
    }
    return b.id - a.id;
  });

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Inventory</h1>
          <p>Track and manage all products in your shop.</p>
        </div>
        <button
          className="btn btn-primary cursor-pointer"
          onClick={() => {
            const name = prompt('Enter new item name:');
            if (name && name.trim()) {
              alert(`Item "${name}" created. You can update stock via WhatsApp!`);
            }
          }}
        >
          <FigmaIcon name="plus" size={17} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar flex flex-col sm:flex-row gap-3">
        <div className="field-search flex-1">
          <FigmaIcon name="search" size={18} />
          <input
            aria-label="Search inventory"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort */}
          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'low_high')}
            className="px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] cursor-pointer"
          >
            <option value="recent">Sort: Recently updated</option>
            <option value="low_high">Stock: Low to high</option>
          </select>
        </div>
      </div>

      {/* Inventory Table Panel */}
      <section className="panel inventory-panel">
        <div className="inventory-table">
          <div className="inventory-row inv-head">
            <span>PRODUCT</span>
            <span>CURRENT STOCK</span>
            <span>UNIT</span>
            <span>MINIMUM STOCK</span>
            <span>STATUS</span>
            <span>UNIT PRICE</span>
            <span>LAST UPDATED</span>
            <span>ACTIONS</span>
          </div>

          {sorted.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#58657d] dark:text-[#94a3b8]">
              No inventory products match your search.
            </div>
          ) : (
            sorted.map((item, idx) => {
              const initials = item.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();
              const isCritical = item.qty <= Math.max(1, Math.floor(item.threshold / 2));
              const isLow = item.qty <= item.threshold;
              const status = isCritical ? 'Critical' : isLow ? 'Low Stock' : 'Normal';
              const statusColor = isCritical ? 'critical' : isLow ? 'low' : 'normal';
              const avatarTone = idx % 3 === 0 ? 'amber' : idx % 3 === 1 ? 'blue' : 'green';

              return (
                <div
                  key={item.id}
                  className="inventory-row cursor-pointer"
                  onClick={() => onSelectProduct(item)}
                >
                  <span className="product-cell">
                    <i className={`product-avatar ${avatarTone}`}>{initials}</i>
                    <b>{item.name}</b>
                  </span>
                  <strong>{item.qty}</strong>
                  <span>{item.unit}</span>
                  <span>{item.threshold} {item.unit}</span>
                  <span>
                    <span className={`status status-${statusColor}`}>{status}</span>
                  </span>
                  <span>₹{(item.price || 10).toFixed(2)}</span>
                  <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">Today</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(item)}
                      className="px-2 py-1 text-xs font-semibold rounded bg-[#eef5ff] dark:bg-[#172544] text-[#1768e5] dark:text-[#60a5fa] hover:opacity-90 cursor-pointer"
                    >
                      View
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

