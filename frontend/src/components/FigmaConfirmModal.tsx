import React from 'react';
import { FigmaIcon } from './FigmaIcon';

interface FigmaConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName?: string;
  qty?: number;
  unit?: string;
  currentStock?: number;
}

export const FigmaConfirmModal: React.FC<FigmaConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName = 'Parle G 100g',
  qty = 20,
  unit = 'packets',
  currentStock = 22
}) => {
  if (!isOpen) return null;

  const newStock = currentStock + qty;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
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
            <p>Review the details before updating stock.</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer">
            <FigmaIcon name="close" size={18} />
          </button>
        </div>

        <div className="modal-product">
          <span className="product-avatar amber">PG</span>
          <div>
            <small>PRODUCT</small>
            <b>{productName}</b>
          </div>
          <span className="status status-normal">Normal</span>
        </div>

        <div className="modal-details">
          <div>
            <small>ACTION</small>
            <b className="positive">ADD</b>
          </div>
          <div>
            <small>QUANTITY</small>
            <b>
              {qty} {unit}
            </b>
          </div>
          <div>
            <small>CURRENT STOCK</small>
            <b>
              {currentStock} {unit}
            </b>
          </div>
          <div className="new-stock">
            <small>NEW STOCK</small>
            <b>
              {newStock} {unit}
            </b>
          </div>
        </div>

        <div className="modal-note">
          <FigmaIcon name="sparkle" size={15} />
          <span>SmartStock AI is 98% confident in this update.</span>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary cursor-pointer" onClick={onConfirm}>
            <FigmaIcon name="check" size={16} />
            <span>Confirm & Update</span>
          </button>
        </div>
      </div>
    </div>
  );
};

