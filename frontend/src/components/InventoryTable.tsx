import React, { useState } from 'react';
import { Search, AlertTriangle, Check, Edit2, X, AlertCircle } from 'lucide-react';
import type { InventoryItem } from '../types';

interface InventoryTableProps {
  items: InventoryItem[];
  onPatchItem: (id: number, patch: { threshold?: number; price?: number; reordered?: boolean }) => Promise<boolean>;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, onPatchItem }) => {
  const [search, setSearch] = useState('');
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editThreshold, setEditThreshold] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditThreshold(item.threshold.toString());
    setEditPrice(item.price ? item.price.toString() : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    const patch: { threshold?: number; price?: number } = {};
    if (editThreshold !== '') {
      patch.threshold = parseFloat(editThreshold);
    }
    if (editPrice !== '') {
      patch.price = parseFloat(editPrice);
    }

    const success = await onPatchItem(id, patch);
    if (success) {
      setToastMessage('Item settings saved successfully.');
      setTimeout(() => setToastMessage(null), 3000);
      setEditingId(null);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterLowOnly ? (it.is_low || it.is_negative || it.is_out_of_stock) : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm shadow-lg flex items-center space-x-2">
          <Check size={16} strokeWidth={2} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} strokeWidth={1.5} className="absolute left-3 top-3 text-[#64748B] dark:text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name..."
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterLowOnly(!filterLowOnly)}
            className={`h-10 px-3.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              filterLowOnly
                ? 'bg-[#FEF3C7] border-[#D97706] text-[#D97706] dark:bg-[#78350F]/40 dark:text-[#F59E0B]'
                : 'border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8]'
            }`}
          >
            <AlertTriangle size={14} strokeWidth={1.5} />
            <span>Low Stock Filter</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#111827] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#243041] bg-[#F8FAFC] dark:bg-[#1F2937]/50 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Alert Level</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#243041]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No items found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isEditing = editingId === item.id;
                  let rowTint = 'hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/30';
                  if (item.is_negative) {
                    rowTint = 'bg-[#FEE2E2]/40 dark:bg-[#7F1D1D]/20';
                  } else if (item.is_low) {
                    rowTint = 'bg-[#FEF3C7]/40 dark:bg-[#78350F]/20';
                  }

                  return (
                    <tr key={item.id} className={`transition-colors ${rowTint}`}>
                      {/* Name */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A] dark:text-[#F1F5F9] capitalize">
                        {item.name}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                        {item.qty} {item.unit}
                      </td>

                      {/* Alert Level (Threshold) */}
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(e.target.value)}
                            className="w-20 h-8 px-2 text-right rounded border border-[#0F766E] bg-white dark:bg-[#0B1220] text-sm"
                          />
                        ) : (
                          <span className="text-[#64748B] dark:text-[#94A3B8]">
                            {item.threshold} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 h-8 px-2 text-right rounded border border-[#0F766E] bg-white dark:bg-[#0B1220] text-sm"
                            placeholder="Price"
                          />
                        ) : (
                          <span className="text-[#0F172A] dark:text-[#F1F5F9]">
                            {item.price_formatted || '—'}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {item.is_negative ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/50 dark:text-[#EF4444]">
                            <AlertCircle size={12} strokeWidth={2} />
                            <span>Negative</span>
                          </span>
                        ) : item.is_out_of_stock ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-[#7F1D1D]/50 dark:text-[#EF4444]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                            <span>Out of Stock</span>
                          </span>
                        ) : item.is_low ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] dark:bg-[#78350F]/50 dark:text-[#F59E0B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] dark:bg-[#14532D]/50 dark:text-[#22C55E]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                            <span>In Stock</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="h-8 w-8 rounded text-[#16A34A] hover:bg-[#DCFCE7] dark:hover:bg-[#14532D]/40 flex items-center justify-center transition-colors cursor-pointer"
                              title="Save Changes"
                            >
                              <Check size={15} strokeWidth={2} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="h-8 w-8 rounded text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/40 flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={15} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="h-8 w-8 rounded text-[#64748B] hover:text-[#0F766E] dark:hover:text-[#14B8A6] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Threshold / Price"
                          >
                            <Edit2 size={14} strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
