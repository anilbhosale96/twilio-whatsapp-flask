import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';

interface FigmaBarcodeAddProductModalProps {
  isOpen: boolean;
  barcode: string;
  onClose: () => void;
  onSaveProduct: (formData: FormData) => Promise<{ success: boolean; message?: string; item?: InventoryItem }>;
  onProductAddedToBill?: (item: InventoryItem, qty: number) => void;
}

const COMMON_UNITS = ['pcs', 'packet', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'bottle'];
const TAX_SLABS = [
  { label: '0% (Exempt)', value: 0.0 },
  { label: '5% (GST)', value: 5.0 },
  { label: '12% (GST)', value: 12.0 },
  { label: '18% (GST)', value: 18.0 },
  { label: '28% (GST)', value: 28.0 }
];

export const FigmaBarcodeAddProductModal: React.FC<FigmaBarcodeAddProductModalProps> = ({
  isOpen,
  barcode,
  onClose,
  onSaveProduct,
  onProductAddedToBill
}) => {
  const [name, setName] = useState('');
  const [customBarcode, setCustomBarcode] = useState(barcode || '');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [taxRate, setTaxRate] = useState(0.0);
  const [category, setCategory] = useState('General Store');
  const [openingStock, setOpeningStock] = useState('10');
  const [billQuantity, setBillQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setSku('');
      setPrice('');
      setCostPrice('');
      setCustomBarcode(barcode || '');
      setBillQuantity('1');
      setErrorMsg(null);
    }
  }, [isOpen, barcode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('Please enter a valid selling price.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const finalBarcode = (barcode || customBarcode || '').trim();
      const formData = new FormData();
      formData.append('name', name.trim());
      if (finalBarcode) formData.append('barcode', finalBarcode);
      if (sku.trim()) formData.append('sku', sku.trim());
      formData.append('unit', unit);
      formData.append('price', numPrice.toString());
      if (costPrice) formData.append('cost_price', parseFloat(costPrice).toString());
      formData.append('tax_rate', taxRate.toString());
      formData.append('category', category);
      formData.append('opening_stock', parseFloat(openingStock || '0').toString());
      formData.append('threshold', '5');

      const res = await onSaveProduct(formData);
      if (res.success && res.item) {
        if (onProductAddedToBill) {
          const qtyToAdd = parseFloat(billQuantity || '1');
          onProductAddedToBill(res.item, isNaN(qtyToAdd) || qtyToAdd <= 0 ? 1 : qtyToAdd);
        }
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to save product to inventory.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <FigmaIcon name="plus" size={17} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {barcode ? 'New Barcode Product' : 'Add New Product to Inventory'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {barcode ? (
                  <>Barcode <b>{barcode}</b> not found. Catalog it & add to current bill.</>
                ) : (
                  'Fill details to save into shop inventory and immediately add to current bill.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Barcode & SKU Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {barcode ? 'Scanned Barcode' : 'Barcode / EAN (Optional)'}
              </label>
              {barcode ? (
                <input
                  type="text"
                  disabled
                  value={barcode}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold"
                />
              ) : (
                <input
                  type="text"
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  placeholder="e.g. 8901030383786"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              )}
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                SKU Code <small>(optional)</small>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BIS-PAR-01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Parle G 100g, Amul Butter 500g"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                <option value="Grocery">Grocery</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Stationery">Stationery</option>
                <option value="General Store">General Store</option>
                <option value="Dairy">Dairy</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-extrabold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price (₹) <small>(opt)</small>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tax Rate (GST)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                {TAX_SLABS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock & Bill Quantity */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Opening Stock ({unit})
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400">Added to shop inventory</span>
            </div>

            {onProductAddedToBill && (
              <div>
                <label className="block font-bold text-blue-700 dark:text-blue-300 mb-1">
                  Add to Current Bill ({unit})
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={billQuantity}
                  onChange={(e) => setBillQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 font-bold text-blue-600"
                />
                <span className="text-[10px] text-blue-500">Auto-adds to this bill</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Product & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

