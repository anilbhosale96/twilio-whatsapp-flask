import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaInventoryProps {
  items: InventoryItem[];
  onSelectProduct: (item: InventoryItem) => void;
  onAddItem: (data: {
    name: string;
    unit?: string;
    qty?: number;
    threshold?: number;
    price?: number;
  }) => Promise<{ success: boolean; message?: string }>;
  onPatchItem: (
    id: number,
    data: {
      name?: string;
      unit?: string;
      qty?: number;
      threshold?: number;
      price?: number;
      reordered?: boolean;
    }
  ) => Promise<boolean>;
  onDeleteItem?: (id: number) => Promise<boolean>;
}

export const FigmaInventory: React.FC<FigmaInventoryProps> = ({
  items,
  onSelectProduct,
  onAddItem,
  onPatchItem,
  onDeleteItem
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'low_high'>('recent');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQty, setNewQty] = useState('20');
  const [newThreshold, setNewThreshold] = useState('5');
  const [newPrice, setNewPrice] = useState('40');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Product Modal State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editQty, setEditQty] = useState('0');
  const [editThreshold, setEditThreshold] = useState('5');
  const [editPrice, setEditPrice] = useState('0');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'low_high') {
      return a.qty - b.qty;
    }
    return b.id - a.id;
  });

  const handleOpenAddModal = () => {
    setNewName('');
    setNewUnit('pcs');
    setNewQty('20');
    setNewThreshold('5');
    setNewPrice('40');
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError('Product name is required.');
      return;
    }
    setIsSubmittingAdd(true);
    setAddError(null);

    const res = await onAddItem({
      name: newName.trim(),
      unit: newUnit.trim().toLowerCase(),
      qty: parseFloat(newQty) || 0,
      threshold: parseFloat(newThreshold) || 5,
      price: parseFloat(newPrice) || 0
    });

    setIsSubmittingAdd(false);
    if (res.success) {
      setIsAddModalOpen(false);
    } else {
      setAddError(res.message || 'Failed to add product.');
    }
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditQty(item.qty.toString());
    setEditThreshold(item.threshold.toString());
    setEditPrice((item.price ?? 0).toString());
    setEditError(null);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName.trim()) {
      setEditError('Product name is required.');
      return;
    }
    setIsSubmittingEdit(true);
    setEditError(null);

    const ok = await onPatchItem(editingItem.id, {
      name: editName.trim(),
      unit: editUnit.trim().toLowerCase(),
      qty: parseFloat(editQty) || 0,
      threshold: parseFloat(editThreshold) || 5,
      price: parseFloat(editPrice) || 0
    });

    setIsSubmittingEdit(false);
    if (ok) {
      setEditingItem(null);
    } else {
      setEditError('Failed to update product details.');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!onDeleteItem) return;
    if (window.confirm(`Are you sure you want to delete "${item.name}" from your inventory?`)) {
      setUpdatingId(item.id);
      await onDeleteItem(item.id);
      setUpdatingId(null);
      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }
    }
  };

  return (
    <div className="page space-y-6">
      {/* Page Heading */}
      <div className="page-heading flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1>Inventory</h1>
          <p>Track, add, and edit all products in your shop.</p>
        </div>
        <button
          className="btn btn-primary cursor-pointer flex items-center space-x-1.5"
          onClick={handleOpenAddModal}
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
            <div className="p-12 text-center text-sm text-[#58657d] dark:text-[#94a3b8] space-y-3">
              <p>No inventory products found.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                + Add your first product
              </button>
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
                  className="inventory-row cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  onClick={() => onSelectProduct(item)}
                >
                  <span className="product-cell">
                    <i className={`product-avatar ${avatarTone}`}>{initials}</i>
                    <b>{item.name}</b>
                  </span>
                  <span
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#1e293b] p-0.5 rounded-lg border border-[#e2e8f0] dark:border-[#334155] whitespace-nowrap shadow-2xs">
                      <button
                        type="button"
                        title="Decrease stock by 1"
                        disabled={updatingId === item.id || Number(item.qty) <= 0}
                        onClick={async () => {
                          const newQ = Math.max(0, Number(item.qty) - 1);
                          setUpdatingId(item.id);
                          await onPatchItem(item.id, { qty: newQ });
                          setUpdatingId(null);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-30 transition-colors shadow-xs"
                      >
                        −
                      </button>
                      <strong className="min-w-[32px] text-center text-xs font-bold tabular-nums text-[#17213a] dark:text-[#f8fafc] px-1">
                        {item.qty}
                      </strong>
                      <button
                        type="button"
                        title="Increase stock by 1"
                        disabled={updatingId === item.id}
                        onClick={async () => {
                          const newQ = Number(item.qty) + 1;
                          setUpdatingId(item.id);
                          await onPatchItem(item.id, { qty: newQ });
                          setUpdatingId(null);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-30 transition-colors shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </span>
                  <span>{item.unit}</span>
                  <span>{item.threshold} {item.unit}</span>
                  <span>
                    <span className={`status status-${statusColor}`}>{status}</span>
                  </span>
                  <span>₹{(item.price || 0).toFixed(2)}</span>
                  <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">Today</span>
                  <span onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-[#eef5ff] dark:bg-[#172544] text-[#1768e5] dark:text-[#60a5fa] hover:opacity-90 cursor-pointer"
                      title="Edit product name, unit, and prices"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(item)}
                      className="px-2 py-1 text-xs font-medium rounded border border-[#e5eaf2] dark:border-[#334155] text-[#58657d] dark:text-[#94a3b8] hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="View product details"
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

      {/* --- ADD PRODUCT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="panel w-full max-w-md p-6 space-y-4 shadow-xl border border-[#e5eaf2] dark:border-[#334155]">
            <div className="flex items-center justify-between border-b pb-3 border-[#e5eaf2] dark:border-[#334155]">
              <h3 className="text-base font-bold text-[#17213a] dark:text-[#f8fafc]">Add New Product</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-2.5 text-xs rounded bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                  Product Name *
                </label>
                <input
                  required
                  placeholder="e.g. Parle G, Basmati Rice, Dettol Soap"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="packet">packet (Packets)</option>
                    <option value="l">l (Litres)</option>
                    <option value="box">box (Boxes)</option>
                    <option value="dozen">dozen</option>
                    <option value="strip">strip (Medicine)</option>
                    <option value="bottle">bottle</option>
                    <option value="g">g (Grams)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e5eaf2] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-[#e5eaf2] dark:border-[#334155] hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="btn btn-primary text-xs cursor-pointer"
                >
                  {isSubmittingAdd ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PRODUCT MODAL --- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="panel w-full max-w-md p-6 space-y-4 shadow-xl border border-[#e5eaf2] dark:border-[#334155]">
            <div className="flex items-center justify-between border-b pb-3 border-[#e5eaf2] dark:border-[#334155]">
              <h3 className="text-base font-bold text-[#17213a] dark:text-[#f8fafc]">
                Edit Product: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-2.5 text-xs rounded bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                  Product Name *
                </label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Unit
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="packet">packet (Packets)</option>
                    <option value="l">l (Litres)</option>
                    <option value="box">box (Boxes)</option>
                    <option value="dozen">dozen</option>
                    <option value="strip">strip (Medicine)</option>
                    <option value="bottle">bottle</option>
                    <option value="g">g (Grams)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#17213a] dark:text-[#f8fafc] block mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#e5eaf2] dark:border-[#334155]">
                {onDeleteItem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingItem)}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer"
                  >
                    Delete Product
                  </button>
                )}

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-[#e5eaf2] dark:border-[#334155] hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="btn btn-primary text-xs cursor-pointer"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
