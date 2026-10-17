import React, { useMemo } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { InventoryItem } from '../types';
import { parseInventoryMessage } from '../utils/messageParser';

interface FigmaConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
  inventory?: InventoryItem[];
  productName?: string;
  qty?: number;
  unit?: string;
  currentStock?: number;
}

export const FigmaConfirmModal: React.FC<FigmaConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  inventory = [],
  productName = 'Parle G 100g',
  qty = 20,
  unit = 'packets',
  currentStock = 22
}) => {
  if (!isOpen) return null;

  const parsed = useMemo(() => {
    if (message) {
      return parseInventoryMessage(message, inventory);
    }
    return { items: [], overallAction: 'ADD' as const };
  }, [message, inventory]);

  const itemsToRender = parsed.items.length > 0 ? parsed.items : [
    {
      name: productName,
      action: 'ADD' as const,
      qty,
      unit,
      currentStock,
      newStock: currentStock + qty,
      initials: productName.slice(0, 2).toUpperCase(),
      avatarColor: 'amber'
    }
  ];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal max-w-lg w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span>
            <FigmaIcon name="sparkle" size={18} />
          </span>
          <div>
            <h2 id="modal-title">Confirm Inventory Update</h2>
            <p>Review the details before updating your stock.</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer">
            <FigmaIcon name="close" size={18} />
          </button>
        </div>

        {/* List of Identified Products */}
        <div className="space-y-4 my-2">
          {itemsToRender.map((it, idx) => (
            <div key={`${it.name}-${idx}`} className="p-3.5 rounded-xl border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] space-y-3">
              <div className="modal-product m-0">
                <span className={`product-avatar ${it.avatarColor}`}>{it.initials}</span>
                <div>
                  <small>PRODUCT</small>
                  <b>{it.name}</b>
                </div>
                <span className={`status ${it.action === 'ADD' ? 'status-normal' : 'status-low'}`}>
                  {it.action === 'ADD' ? 'Stock In' : 'Stock Out'}
                </span>
              </div>

              <div className="modal-details grid grid-cols-4 gap-2 text-center pt-2 border-t border-[#f1f5f9] dark:border-[#1e293b]">
                <div>
                  <small>ACTION</small>
                  <b className={it.action === 'ADD' ? 'positive' : 'text-red-500'}>{it.action}</b>
                </div>
                <div>
                  <small>QUANTITY</small>
                  <b>
                    {it.action === 'ADD' ? '+' : '−'}{it.qty} {it.unit}
                  </b>
                </div>
                <div>
                  <small>CURRENT</small>
                  <b>
                    {it.currentStock} {it.unit}
                  </b>
                </div>
                <div className="new-stock">
                  <small>NEW STOCK</small>
                  <b className="text-blue-600 dark:text-blue-400">
                    {it.newStock} {it.unit}
                  </b>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-note mt-3">
          <FigmaIcon name="sparkle" size={15} />
          <span>SmartStock AI is 98% confident in these identified items.</span>
        </div>

        <div className="modal-actions mt-4">
          <button type="button" className="btn btn-ghost cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary cursor-pointer" onClick={onConfirm}>
            <FigmaIcon name="check" size={16} />
            <span>Confirm & Update ({itemsToRender.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
