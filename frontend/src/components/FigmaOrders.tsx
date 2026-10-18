import React, { useState } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { OrderData, OrderItemData, InventoryItem } from '../types';

interface FigmaOrdersProps {
  orders: OrderData[];
  inventory: InventoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateItems: (orderId: string, items: any[], notes?: string) => Promise<{ success: boolean; message?: string }>;
  onSendQuote: (orderId: string, data: { discount: number; tax_rate: number; delivery_charge: number; notes?: string }) => Promise<{ success: boolean; message?: string; bill_number?: string }>;
  onGenerateBill: (orderId: string, data: { bill_type: string; discount: number; tax_rate: number; delivery_charge: number; payment_method?: string; notes?: string }) => Promise<{ success: boolean; message?: string; bill_number?: string }>;
  onUpdateStatus: (orderId: string, status: string, notes?: string) => Promise<{ success: boolean; message?: string }>;
  onMarkPaid: (orderId: string) => Promise<{ success: boolean; message?: string }>;
  onShowToast: (msg: string) => void;
}

const STATUS_TABS = [
  'All',
  'New',
  'Reviewing',
  'Awaiting Price',
  'Quote Sent',
  'Confirmed',
  'Preparing',
  'Completed',
  'Cancelled'
];

export const FigmaOrders: React.FC<FigmaOrdersProps> = ({
  orders,
  inventory,
  isLoading,
  onRefresh,
  onUpdateItems,
  onSendQuote,
  onGenerateBill,
  onUpdateStatus,
  onMarkPaid,
  onShowToast
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  // Detail Modal State
  const [editedItems, setEditedItems] = useState<OrderItemData[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSavingItems, setIsSavingItems] = useState<boolean>(false);

  // Quote / Bill Modal
  const [modalMode, setModalMode] = useState<'quote' | 'bill' | null>(null);
  const [discountVal, setDiscountVal] = useState<string>('0');
  const [taxRateVal, setTaxRateVal] = useState<string>('5.0');
  const [deliveryChargeVal, setDeliveryChargeVal] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isSubmittingBill, setIsSubmittingBill] = useState<boolean>(false);

  // Add Item to Order State
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<string>('1');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<string>('pcs');

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatus === 'All' || o.status.toLowerCase() === selectedStatus.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      o.id.toLowerCase().includes(query) ||
      o.customer_name.toLowerCase().includes(query) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const openOrderDetail = (order: OrderData) => {
    setSelectedOrder(order);
    setEditedItems(JSON.parse(JSON.stringify(order.items || [])));
    setOrderNotes(order.notes || '');
  };

  const closeOrderDetail = () => {
    setSelectedOrder(null);
    setModalMode(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Reviewing':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Awaiting Price':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Quote Sent':
      case 'Awaiting Customer Approval':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Confirmed':
      case 'Preparing':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Completed':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  // Handle local item edits
  const handleItemPriceChange = (index: number, val: string) => {
    const num = val === '' ? null : parseFloat(val);
    setEditedItems((prev) => {
      const copy = [...prev];
      copy[index].unit_price = num;
      copy[index].line_total = num !== null ? Math.round(num * copy[index].qty * 100) / 100 : 0;
      copy[index].is_confirmed_by_vendor = true;
      return copy;
    });
  };

  const handleItemQtyChange = (index: number, val: string) => {
    const qty = parseFloat(val) || 1;
    setEditedItems((prev) => {
      const copy = [...prev];
      copy[index].qty = qty;
      const up = copy[index].unit_price;
      copy[index].line_total = up !== null && up !== undefined ? Math.round(up * qty * 100) / 100 : 0;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyReferencePrice = (index: number) => {
    const it = editedItems[index];
    if (it.unit_price) {
      setEditedItems((prev) => {
        const copy = [...prev];
        copy[index].is_confirmed_by_vendor = true;
        return copy;
      });
      onShowToast(`Applied price ₹${it.unit_price} for ${it.product_name}`);
    }
  };

  const handleAddManualItem = () => {
    if (!newItemName.trim()) {
      onShowToast('Please enter an item name');
      return;
    }
    const qty = parseFloat(newItemQty) || 1;
    const price = newItemPrice ? parseFloat(newItemPrice) : null;

    // Check inventory match
    const matched = inventory.find(
      (inv) => inv.name.toLowerCase() === newItemName.trim().toLowerCase()
    );

    const newItem: OrderItemData = {
      product_name: newItemName.trim(),
      unit: newItemUnit || 'pcs',
      qty,
      unit_price: price,
      line_total: price ? Math.round(price * qty * 100) / 100 : 0,
      item_id: matched ? matched.id : null,
      price_source: matched && matched.price === price ? 'vendor' : 'manual_quote',
      in_stock: matched ? matched.qty >= qty : false,
      current_inventory_qty: matched ? matched.qty : 0,
      is_confirmed_by_vendor: price !== null
    };

    setEditedItems((prev) => [...prev, newItem]);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    onShowToast(`Added "${newItem.product_name}" to order`);
  };

  const handleSaveItems = async () => {
    if (!selectedOrder) return;
    setIsSavingItems(true);
    try {
      const res = await onUpdateItems(selectedOrder.id, editedItems, orderNotes);
      if (res.success) {
        onShowToast('Order items and prices updated successfully!');
        onRefresh();
      } else {
        onShowToast(res.message || 'Failed to update order items');
      }
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleSubmitQuoteOrBill = async () => {
    if (!selectedOrder || !modalMode) return;
    setIsSubmittingBill(true);

    const disc = parseFloat(discountVal) || 0;
    const tax = parseFloat(taxRateVal) || 0;
    const deliv = parseFloat(deliveryChargeVal) || 0;

    try {
      if (modalMode === 'quote') {
        const res = await onSendQuote(selectedOrder.id, {
          discount: disc,
          tax_rate: tax,
          delivery_charge: deliv,
          notes: actionNotes
        });
        if (res.success) {
          onShowToast(`Quotation ${res.bill_number || ''} sent to customer!`);
          setModalMode(null);
          closeOrderDetail();
          onRefresh();
        } else {
          onShowToast(res.message || 'Failed to send quotation.');
        }
      } else {
        const res = await onGenerateBill(selectedOrder.id, {
          bill_type: 'invoice',
          discount: disc,
          tax_rate: tax,
          delivery_charge: deliv,
          payment_method: paymentMethod,
          notes: actionNotes
        });
        if (res.success) {
          onShowToast(`Invoice ${res.bill_number || ''} generated successfully!`);
          setModalMode(null);
          closeOrderDetail();
          onRefresh();
        } else {
          onShowToast(res.message || 'Failed to generate invoice.');
        }
      }
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Subtotal of currently edited items
  const currentSubtotal = editedItems.reduce((acc, it) => acc + (it.line_total || 0), 0);

  return (
    <div className="orders-workspace space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FigmaIcon name="bag" size={20} className="text-blue-600" />
            <span>Customer Orders & Quotations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-semibold">
              {orders.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage incoming requests, review items, provide instant price quotes, and generate GST invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer..."
              className="pl-8 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64 shadow-xs"
            />
            <span className="absolute left-2.5 top-2 text-slate-400">
              <FigmaIcon name="search" size={14} />
            </span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer shadow-xs"
            title="Refresh Orders"
          >
            <FigmaIcon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {STATUS_TABS.map((tab) => {
          const count =
            tab === 'All'
              ? orders.length
              : orders.filter((o) => o.status.toLowerCase() === tab.toLowerCase()).length;
          const isActive = selectedStatus === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List / Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-sm w-1/2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-sm w-3/4" />
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <span className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <FigmaIcon name="bag" size={24} />
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No orders in this section</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            When customers place orders from your catalog, submit shopping lists, or upload receipts, they will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const hasBills = order.bills && order.bills.length > 0;
            const latestBill = hasBills ? order.bills[0] : null;

            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-3.5 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {order.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {order.customer_name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      📱 {order.customer_phone || 'Walk-in'} {order.customer_address ? `· 📍 ${order.customer_address}` : ''}
                    </p>
                  </div>
                </div>

                {/* Body / Items Preview */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      {order.has_image && <span className="ml-1 text-[10px] text-indigo-500 font-bold">📷 Image List</span>}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      ₹{order.total_amount ? order.total_amount.toFixed(2) : '0.00'}
                    </span>
                  </div>

                  {order.raw_text && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                      “{order.raw_text}”
                    </p>
                  )}

                  {order.items && order.items.length > 0 && (
                    <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      {order.items.slice(0, 3).map((it, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span className="truncate max-w-[170px]">• {it.product_name}</span>
                          <span>{it.qty} {it.unit}</span>
                        </li>
                      ))}
                      {order.items.length > 3 && (
                        <li className="text-[10px] text-slate-400">+ {order.items.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {latestBill?.has_pdf && (
                      <a
                        href={`/api/orders/${order.id}/download-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                        title="Download Bill PDF"
                      >
                        <FigmaIcon name="download" size={12} />
                        <span>PDF</span>
                      </a>
                    )}
                    {order.price_status === 'paid' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ✓ PAID
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {order.price_status}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openOrderDetail(order)}
                    className="btn btn-primary px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>Manage Order</span>
                    <FigmaIcon name="arrow" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER DETAIL & QUOTATION WORKSPACE MODAL */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                    {selectedOrder.id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    · {new Date(selectedOrder.created_at || '').toLocaleString('en-IN')}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedOrder.customer_name}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeOrderDetail}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Customer & Delivery Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">CUSTOMER PHONE</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedOrder.customer_phone || 'Walk-in Customer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">DELIVERY ADDRESS</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedOrder.customer_address || 'Store Pickup'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">ORDER TYPE</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                    {selectedOrder.request_type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Uploaded Shopping List Image Preview */}
              {selectedOrder.has_image && (
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <FigmaIcon name="camera" size={14} />
                      <span>Customer Uploaded Shopping List / Photo</span>
                    </span>
                    <a
                      href={`/api/orders/${selectedOrder.id}/image`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Open Full Image ↗
                    </a>
                  </div>
                  <div className="max-h-56 overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 flex items-center justify-center">
                    <img
                      src={`/api/orders/${selectedOrder.id}/image`}
                      alt="Customer list"
                      className="object-contain max-h-56 w-auto"
                    />
                  </div>
                </div>
              )}

              {/* Free text note from customer */}
              {selectedOrder.raw_text && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                  <span className="font-semibold text-slate-500">Customer shopping note:</span>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line font-mono text-[11px]">
                    {selectedOrder.raw_text}
                  </p>
                </div>
              )}

              {/* Items Management Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Order Items & Quotation Pricing
                  </h4>
                  <span className="text-xs text-slate-500">
                    Subtotal: <b className="text-slate-900 dark:text-white text-sm">₹{currentSubtotal.toFixed(2)}</b>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-20">Unit</th>
                        <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                        <th className="py-2.5 px-3">Stock & Price Source</th>
                        <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10">✕</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {editedItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {it.product_name}
                            </span>
                            {it.reference_note && (
                              <span className="text-[10px] text-slate-500 block">
                                {it.reference_note}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={it.qty}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                              className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-slate-500">{it.unit}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-1.5 top-1 text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={it.unit_price !== null && it.unit_price !== undefined ? it.unit_price : ''}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                                placeholder="Rate"
                                className="w-24 pl-4 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 space-y-1">
                            {it.in_stock ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                In Stock ({it.current_inventory_qty || 0})
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Need Stock ({it.current_inventory_qty || 0} avail)
                              </span>
                            )}

                            {it.price_source === 'reference_online' && !it.is_confirmed_by_vendor && (
                              <button
                                type="button"
                                onClick={() => handleApplyReferencePrice(idx)}
                                className="block text-[10px] text-blue-600 dark:text-blue-400 underline font-semibold cursor-pointer"
                              >
                                Accept Ref Price
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            ₹{(it.line_total || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-red-500 cursor-pointer"
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Item Row */}
                <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Product name (or pick from store)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="number"
                    min="0.1"
                    placeholder="Qty"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Unit (pcs/kg)"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Price (₹)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Save modified items button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingItems}
                    onClick={handleSaveItems}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shadow-xs"
                  >
                    {isSavingItems ? 'Saving Changes...' : '💾 Save Items & Prices'}
                  </button>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Order Status:</span>
                  <select
                    value={selectedOrder.status}
                    onChange={async (e) => {
                      const res = await onUpdateStatus(selectedOrder.id, e.target.value);
                      if (res.success) {
                        onShowToast(`Status updated to ${e.target.value}`);
                        onRefresh();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="New">New</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Awaiting Price">Awaiting Price</option>
                    <option value="Quote Sent">Quote Sent</option>
                    <option value="Confirmed">Confirmed (Reserve Stock)</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Quotation & Billing Trigger Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedOrder.price_status !== 'paid' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await onMarkPaid(selectedOrder.id);
                        if (res.success) {
                          onShowToast('Order marked as Paid!');
                          onRefresh();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      ✓ Mark as Paid
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('quote');
                      setDiscountVal(String(selectedOrder.discount || 0));
                      setTaxRateVal('5.0');
                      setDeliveryChargeVal(String(selectedOrder.delivery_charge || 0));
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold hover:bg-purple-100 cursor-pointer"
                  >
                    📄 Send Quotation
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('bill');
                      setDiscountVal(String(selectedOrder.discount || 0));
                      setTaxRateVal('5.0');
                      setDeliveryChargeVal(String(selectedOrder.delivery_charge || 0));
                    }}
                    className="btn btn-primary px-4 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    🧾 Generate Final Bill (PDF)
                  </button>
                </div>
              </div>

              {/* Revision History & Bill Downloads */}
              {selectedOrder.bills && selectedOrder.bills.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Generated Invoices & Quotations ({selectedOrder.bills.length})
                  </h5>
                  <div className="space-y-1.5">
                    {selectedOrder.bills.map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <b className="font-mono text-blue-600 dark:text-blue-400">{b.bill_number}</b>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800">
                              {b.bill_type} (v{b.version})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {b.issue_date ? new Date(b.issue_date).toLocaleDateString('en-IN') : ''}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Total: <b>₹{b.final_total.toFixed(2)}</b> · Status: <span className="uppercase">{b.payment_status}</span>
                          </span>
                        </div>

                        {b.has_pdf && (
                          <a
                            href={`/api/orders/${selectedOrder.id}/download-pdf?bill_number=${b.bill_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
                          >
                            <FigmaIcon name="download" size={13} />
                            <span>Download PDF</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUOTATION & FINAL BILL CALCULATION MODAL */}
      {/* ========================================================================= */}
      {modalMode && selectedOrder && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                {modalMode === 'quote' ? 'Prepare & Send Quotation' : 'Generate Tax Invoice (PDF)'}
              </h4>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <b>₹{currentSubtotal.toFixed(2)}</b>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Applicable GST Rate (%)
                </label>
                <select
                  value={taxRateVal}
                  onChange={(e) => setTaxRateVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs"
                >
                  <option value="0">0% (Nil / Exempted Essentials)</option>
                  <option value="5.0">5% GST (2.5% CGST + 2.5% SGST)</option>
                  <option value="12.0">12% GST (6% CGST + 6% SGST)</option>
                  <option value="18.0">18% GST (9% CGST + 9% SGST)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={deliveryChargeVal}
                  onChange={(e) => setDeliveryChargeVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs"
                />
              </div>

              {modalMode === 'bill' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="Cash">Cash on Delivery</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Store Credit">Khata / Store Credit</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note to Customer <small>(optional)</small>
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Items packed with care, delivery in 30 mins."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBill}
                onClick={handleSubmitQuoteOrBill}
                className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isSubmittingBill
                  ? 'Processing...'
                  : modalMode === 'quote'
                  ? 'Send Quotation'
                  : 'Issue Tax Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
