import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FigmaIcon } from './FigmaIcon';
import { FigmaBarcodeScanner } from './FigmaBarcodeScanner';
import { FigmaBarcodeAddProductModal } from './FigmaBarcodeAddProductModal';
import type {
  InventoryItem,
  VendorBillData,
  VendorBillItem,
  CustomerRecord,
  BarcodeDecodeResult
} from '../types';

interface FigmaBillingProps {
  inventory: InventoryItem[];
  shopName?: string | null;
  ownerName?: string | null;
  onFetchCustomers: (query?: string) => Promise<{ success: boolean; customers: CustomerRecord[] }>;
  onCreateCustomer: (data: { name: string; phone: string; address?: string; city?: string }) => Promise<{ success: boolean; message?: string; customer?: CustomerRecord }>;
  onCreateBill: (payload: any) => Promise<{ success: boolean; message?: string; bill?: VendorBillData }>;
  onFetchBills: (statusFilter?: string, search?: string) => Promise<{ success: boolean; total: number; bills: VendorBillData[] }>;
  onFetchBillDetail: (id: number) => Promise<{ success: boolean; bill: VendorBillData | null }>;
  onFinalizeBill: (id: number) => Promise<{ success: boolean; message?: string; bill?: VendorBillData }>;
  onSendBill: (id: number, channel: string, recipientPhone?: string) => Promise<{ success: boolean; message?: string; status?: string; bill?: VendorBillData }>;
  onRecordPayment: (id: number, amount: number, paymentMethod: string, notes?: string) => Promise<{ success: boolean; message?: string; bill?: VendorBillData }>;
  onCancelBill: (id: number) => Promise<{ success: boolean; message?: string; bill?: VendorBillData }>;
  onSearchBarcode: (code: string) => Promise<{ found: boolean; item?: any; message?: string }>;
  onQuickAddProduct: (formData: FormData) => Promise<{ success: boolean; message?: string; item?: InventoryItem }>;
  onDecodeBarcodeImage: (file: File) => Promise<{ success: boolean; message: string; barcodes: BarcodeDecodeResult[]; primary_barcode?: string }>;
  onShowToast: (msg: string) => void;
}

export const FigmaBilling: React.FC<FigmaBillingProps> = ({
  inventory,
  shopName,
  ownerName: _ownerName,
  onFetchCustomers,
  onCreateCustomer,
  onCreateBill,
  onFetchBills,
  onFetchBillDetail: _onFetchBillDetail,
  onFinalizeBill: _onFinalizeBill,
  onSendBill,
  onRecordPayment,
  onCancelBill,
  onSearchBarcode,
  onQuickAddProduct,
  onDecodeBarcodeImage,
  onShowToast
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'create' | 'history'>('create');

  // Customer selection
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // New customer form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Line items state
  const [lineItems, setLineItems] = useState<VendorBillItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Bill financial values
  const [overallDiscount, setOverallDiscount] = useState('0');
  const [overallTaxRate, setOverallTaxRate] = useState('0');
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [billType, setBillType] = useState<'invoice' | 'quotation'>('invoice');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'partially_paid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [deliveryChannel, setDeliveryChannel] = useState<'none' | 'whatsapp' | 'sms'>('none');
  const [billNotes, setBillNotes] = useState('');
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  // Barcode scanner modal states
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [scannedUnknownBarcode, setScannedUnknownBarcode] = useState('');

  // Bill Preview & Detail Modals
  const [previewBillData, setPreviewBillData] = useState<any | null>(null);
  const [detailBill, setDetailBill] = useState<VendorBillData | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('Cash');

  // Bill History filters & state
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [billsHistory, setBillsHistory] = useState<VendorBillData[]>([]);
  const [totalBillsCount, setTotalBillsCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load customers
  const loadCustomers = useCallback(async (query?: string) => {
    const res = await onFetchCustomers(query);
    if (res.success) {
      setCustomerList(res.customers);
    }
  }, [onFetchCustomers]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load bills history
  const loadBillsHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await onFetchBills(historyStatusFilter, historySearchQuery);
      if (res.success) {
        setBillsHistory(res.bills);
        setTotalBillsCount(res.total);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyStatusFilter, historySearchQuery, onFetchBills]);

  useEffect(() => {
    if (activeMainTab === 'history') {
      loadBillsHistory();
    }
  }, [activeMainTab, loadBillsHistory]);

  // Filter products from inventory for autocomplete
  const filteredInventory = useMemo(() => {
    if (!productSearchQuery.trim()) return inventory.slice(0, 8);
    const q = productSearchQuery.toLowerCase().trim();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [inventory, productSearchQuery]);

  // Add product to bill
  const handleAddProductToBill = (item: InventoryItem, defaultQty = 1) => {
    setLineItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.item_id === item.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const newQty = copy[existingIdx].qty + defaultQty;
        copy[existingIdx] = {
          ...copy[existingIdx],
          qty: newQty,
          line_total: Math.round(newQty * copy[existingIdx].unit_price * 100) / 100
        };
        return copy;
      }

      const unitPrice = item.price || 0;
      return [
        ...prev,
        {
          item_id: item.id,
          product_name: item.name,
          qty: defaultQty,
          unit: item.unit || 'pcs',
          unit_price: unitPrice,
          barcode: item.barcode,
          sku: item.sku,
          discount: 0,
          tax_rate: item.tax_rate || 0,
          line_total: Math.round(defaultQty * unitPrice * 100) / 100,
          current_stock: item.qty
        }
      ];
    });
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    onShowToast(`Added "${item.name}" to bill.`);
  };

  // Barcode scanned handler
  const handleBarcodeScanned = async (barcode: string) => {
    setIsBarcodeScannerOpen(false);
    onShowToast(`Scanned barcode: ${barcode}`);

    // Search in vendor inventory
    const searchRes = await onSearchBarcode(barcode);
    if (searchRes.found && searchRes.item) {
      handleAddProductToBill(searchRes.item, 1);
    } else {
      // Not found: open quick add product modal!
      setScannedUnknownBarcode(barcode);
      setIsAddProductModalOpen(true);
    }
  };

  // Modify line item
  const handleUpdateLineItem = (idx: number, updates: Partial<VendorBillItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const cur = copy[idx];
      const updated = { ...cur, ...updates };
      // Recalculate line total: qty * unit_price * (1 - discount/100)
      const discountedRate = updated.unit_price * (1 - (updated.discount || 0) / 100);
      updated.line_total = Math.max(0, Math.round(updated.qty * discountedRate * 100) / 100);
      copy[idx] = updated;
      return copy;
    });
  };

  const handleRemoveLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    lineItems.forEach((it) => {
      subtotal += it.line_total;
    });

    const disc = Math.max(0, parseFloat(overallDiscount || '0'));
    const taxableAmount = Math.max(0, subtotal - disc);

    const taxRate = Math.max(0, parseFloat(overallTaxRate || '0'));
    const taxAmount = (taxableAmount * taxRate) / 100;
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;

    const delivery = Math.max(0, parseFloat(deliveryCharge || '0'));
    const finalTotal = Math.round((taxableAmount + taxAmount + delivery) * 100) / 100;

    let paid = 0;
    if (paymentStatus === 'paid') {
      paid = finalTotal;
    } else if (paymentStatus === 'partially_paid') {
      paid = Math.min(finalTotal, parseFloat(amountPaidInput || '0'));
    }
    const balanceDue = Math.max(0, Math.round((finalTotal - paid) * 100) / 100);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: disc,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      taxRate,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      delivery,
      finalTotal,
      paid,
      balanceDue
    };
  }, [lineItems, overallDiscount, overallTaxRate, deliveryCharge, paymentStatus, amountPaidInput]);

  // Create new customer submit
  const handleAddNewCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      onShowToast('Customer name and phone number are required.');
      return;
    }
    setIsAddingCustomer(true);
    try {
      const res = await onCreateCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim(),
        city: 'Pune'
      });
      if (res.success && res.customer) {
        setSelectedCustomer(res.customer);
        setIsAddCustomerModalOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
        loadCustomers();
        onShowToast(`Customer "${res.customer.name}" added successfully.`);
      } else {
        onShowToast(res.message || 'Failed to add customer.');
      }
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Submit Bill (Draft or Finalized)
  const handleSaveBill = async (status: 'draft' | 'finalized') => {
    if (lineItems.length === 0) {
      onShowToast('Please add at least one product to the bill.');
      return;
    }

    // Check oversell warnings
    if (status === 'finalized') {
      const oversoldItem = lineItems.find(
        (it) => it.current_stock !== undefined && it.current_stock < it.qty
      );
      if (oversoldItem) {
        onShowToast(
          `Insufficient stock for "${oversoldItem.product_name}". Available: ${oversoldItem.current_stock}, Requested: ${oversoldItem.qty}.`
        );
        return;
      }
    }

    setIsSubmittingBill(true);
    try {
      const payload = {
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        customer_phone: selectedCustomer?.phone || '',
        customer_address: selectedCustomer?.address || '',
        bill_type: billType,
        status: status,
        items: lineItems.map((it) => ({
          item_id: it.item_id,
          product_name: it.product_name,
          qty: it.qty,
          unit: it.unit,
          unit_price: it.unit_price,
          barcode: it.barcode,
          sku: it.sku,
          discount: it.discount || 0,
          tax_rate: it.tax_rate || 0
        })),
        discount: calculations.discount,
        tax_rate: calculations.taxRate,
        delivery_charge: calculations.delivery,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_paid: calculations.paid,
        delivery_channel: deliveryChannel === 'none' ? null : deliveryChannel,
        notes: billNotes
      };

      const res = await onCreateBill(payload);
      if (res.success && res.bill) {
        onShowToast(
          `Bill #${res.bill.bill_number} ${status === 'finalized' ? 'finalized' : 'saved as draft'}!`
        );
        // Clear form
        setLineItems([]);
        setSelectedCustomer(null);
        setOverallDiscount('0');
        setOverallTaxRate('0');
        setDeliveryCharge('0');
        setBillNotes('');
        setAmountPaidInput('');
        setPreviewBillData(null);
        // If finalized, switch to history or open detail
        if (status === 'finalized') {
          setDetailBill(res.bill);
          loadBillsHistory();
        }
      } else {
        onShowToast(res.message || 'Failed to create bill.');
      }
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = () => {
    if (lineItems.length === 0) {
      onShowToast('Please add products before previewing.');
      return;
    }
    setPreviewBillData({
      bill_number: 'PREVIEW-TEMP',
      bill_type: billType,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      customer_phone: selectedCustomer?.phone || 'N/A',
      customer_address: selectedCustomer?.address || '',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: lineItems,
      calculations,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      notes: billNotes
    });
  };

  return (
    <div className="page space-y-6">
      {/* Barcode Scanner Modal */}
      <FigmaBarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
        onDecodeImage={onDecodeBarcodeImage}
      />

      {/* Quick Add Product from Barcode Modal */}
      <FigmaBarcodeAddProductModal
        isOpen={isAddProductModalOpen}
        barcode={scannedUnknownBarcode}
        onClose={() => setIsAddProductModalOpen(false)}
        onSaveProduct={onQuickAddProduct}
        onProductAddedToBill={(item, qty) => {
          handleAddProductToBill(item, qty);
        }}
      />

      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>POS Billing & Invoicing</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
              GST Ready
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Create printable invoices, scan retail barcodes, and send bills via WhatsApp / SMS.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('create')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMainTab === 'create'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FigmaIcon name="plus" size={14} />
            <span>Create Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMainTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FigmaIcon name="report" size={14} />
            <span>Bill History ({totalBillsCount})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORKSPACE 1: CREATE BILL */}
      {/* ========================================================================= */}
      {activeMainTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer Selection & Line Items (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            {/* 1. Customer Selection Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FigmaIcon name="message" size={15} className="text-blue-600" />
                  <span>Customer Details</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Add New Customer</span>
                </button>
              </div>

              {selectedCustomer ? (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                  <div>
                    <b className="text-slate-900 dark:text-white text-sm block">
                      {selectedCustomer.name}
                    </b>
                    <span className="text-slate-500">
                      Phone: <b>{selectedCustomer.phone}</b> · {selectedCustomer.address || 'Pune'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-slate-400 hover:text-rose-500 font-bold px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    Change ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                      loadCustomers(e.target.value);
                    }}
                    placeholder="Search customer by name or phone..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  {isCustomerDropdownOpen && (
                    <div className="absolute left-0 right-0 top-12 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      <div
                        onClick={() => {
                          setSelectedCustomer({ name: 'Walk-in Customer', phone: '' });
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer font-bold text-slate-600 dark:text-slate-300"
                      >
                        🚶 Walk-in Customer (No phone record)
                      </div>
                      {customerList.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <b className="block text-slate-900 dark:text-white">{c.name}</b>
                            <span className="text-[11px] text-slate-400">{c.phone}</span>
                          </div>
                          {c.is_registered && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Verified
                            </span>
                          )}
                        </div>
                      ))}
                      {customerList.length === 0 && (
                        <div className="p-3 text-center text-slate-400">
                          No matching customer.
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomerDropdownOpen(false);
                              setIsAddCustomerModalOpen(true);
                            }}
                            className="ml-2 text-blue-600 font-bold hover:underline"
                          >
                            + Create Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Product Search & Barcode Scanning Bar */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 self-start sm:self-center">
                  <FigmaIcon name="inventory" size={15} className="text-blue-600" />
                  <span>Add Products to Bill</span>
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="flex-1 sm:flex-none btn btn-primary px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FigmaIcon name="camera" size={14} />
                    <span>Scan Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FigmaIcon name="upload" size={14} />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Autocomplete Product Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={productSearchQuery}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  placeholder="Type product name, SKU, or enter barcode number..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400">
                  <FigmaIcon name="search" size={15} />
                </span>

                {isProductDropdownOpen && filteredInventory.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                    {filteredInventory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAddProductToBill(item, 1)}
                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <b className="text-slate-900 dark:text-white block">{item.name}</b>
                          <span className="text-[11px] text-slate-400">
                            Unit: {item.unit} · Stock: {item.qty} · {item.barcode ? `Barcode: ${item.barcode}` : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <b className="text-sm text-blue-600 block">₹{item.price || '0.00'}</b>
                          <span className="text-[10px] text-slate-400">Click to Add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                      <th className="py-2 px-1">#</th>
                      <th className="py-2 px-2">Item Description</th>
                      <th className="py-2 px-2 w-20 text-center">Stock</th>
                      <th className="py-2 px-2 w-24">Qty</th>
                      <th className="py-2 px-2 w-24">Price (₹)</th>
                      <th className="py-2 px-2 w-20">Disc %</th>
                      <th className="py-2 px-2 w-24 text-right">Total (₹)</th>
                      <th className="py-2 px-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No items added yet. Search products above or scan barcodes to begin.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((it, idx) => {
                        const isOversold =
                          it.current_stock !== undefined && it.current_stock < it.qty;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-1 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2">
                              <b className="text-slate-900 dark:text-white block">
                                {it.product_name}
                              </b>
                              {it.barcode && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {it.barcode}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isOversold
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {it.current_stock ?? 'N/A'} {it.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={it.qty}
                                  onChange={(e) =>
                                    handleUpdateLineItem(idx, {
                                      qty: parseFloat(e.target.value) || 1
                                    })
                                  }
                                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                                />
                                <span className="text-[10px] text-slate-400">{it.unit}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.unit_price}
                                onChange={(e) =>
                                  handleUpdateLineItem(idx, {
                                    unit_price: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={it.discount || 0}
                                onChange={(e) =>
                                  handleUpdateLineItem(idx, {
                                    discount: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 dark:text-white">
                              ₹{it.line_total.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-slate-400 hover:text-rose-500 font-bold text-sm"
                              >
                                ✕
                              </button>
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

          {/* Right Column: Financial Summary & Finalization (1/3 width) */}
          <div className="space-y-5">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Billing & Tax Summary</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {billType === 'invoice' ? 'Tax Invoice' : 'Draft Quotation'}
                </span>
              </h3>

              {/* Bill Type Selector */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBillType('invoice')}
                  className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    billType === 'invoice'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Final Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setBillType('quotation')}
                  className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    billType === 'quotation'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Price Quotation
                </button>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <b>₹{calculations.subtotal.toFixed(2)}</b>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-400">Overall Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-right font-bold"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-400">GST Tax Rate (%):</span>
                  <select
                    value={overallTaxRate}
                    onChange={(e) => setOverallTaxRate(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    <option value="0">0% (None)</option>
                    <option value="5">5% (2.5+2.5)</option>
                    <option value="12">12% (6+6)</option>
                    <option value="18">18% (9+9)</option>
                    <option value="28">28% (14+14)</option>
                  </select>
                </div>

                {calculations.taxRate > 0 && (
                  <div className="pl-3 border-l-2 border-blue-400 space-y-1 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>CGST ({(calculations.taxRate / 2).toFixed(1)}%):</span>
                      <span>₹{calculations.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({(calculations.taxRate / 2).toFixed(1)}%):</span>
                      <span>₹{calculations.sgst.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-400">Delivery / Other (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-right font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-lg text-blue-600 dark:text-blue-400">
                    ₹{calculations.finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Status & Details */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="unpaid">Unpaid / Due on Credit</option>
                  </select>
                </div>

                {paymentStatus !== 'unpaid' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / GPay</option>
                        <option value="Card">Card</option>
                        <option value="Credit">Store Credit</option>
                      </select>
                    </div>

                    {paymentStatus === 'partially_paid' && (
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Amount Paid (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={amountPaidInput}
                          onChange={(e) => setAmountPaidInput(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}

                {paymentStatus === 'partially_paid' && (
                  <div className="flex justify-between text-xs font-bold text-amber-600">
                    <span>Balance Due:</span>
                    <span>₹{calculations.balanceDue.toFixed(2)}</span>
                  </div>
                )}

                {/* Delivery Channel */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Send Bill to Customer
                  </label>
                  <select
                    value={deliveryChannel}
                    onChange={(e: any) => setDeliveryChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="none">Do Not Send (Paper / Counter Only)</option>
                    <option value="whatsapp">Send WhatsApp Message with PDF link</option>
                    <option value="sms">Send SMS Text with PDF link</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FigmaIcon name="search" size={14} />
                  <span>Preview Bill</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingBill}
                    onClick={() => handleSaveBill('draft')}
                    className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingBill}
                    onClick={() => handleSaveBill('finalized')}
                    className="btn btn-primary py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingBill ? 'Processing...' : 'Finalize & Print'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE 2: BILL HISTORY & INVOICES */}
      {/* ========================================================================= */}
      {activeMainTab === 'history' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search by bill #, customer name or phone..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">
                <FigmaIcon name="search" size={14} />
              </span>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
              {['all', 'finalized', 'draft', 'paid', 'partially_paid', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                    historyStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Bills Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Delivery</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading bills...
                    </td>
                  </tr>
                ) : billsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No bills found matching current filter.
                    </td>
                  </tr>
                ) : (
                  billsHistory.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {bill.bill_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {bill.issue_date ? new Date(bill.issue_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <b className="text-slate-900 dark:text-white block">{bill.customer_name}</b>
                        <span className="text-[11px] text-slate-400">{bill.customer_phone || 'Counter'}</span>
                      </td>
                      <td className="py-3 px-3 capitalize font-semibold text-slate-600 dark:text-slate-300">
                        {bill.bill_type}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                        ₹{bill.final_total.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bill.payment_status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {bill.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-500 capitalize">
                          {bill.delivery_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setDetailBill(bill)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                        >
                          View
                        </button>

                        {bill.has_pdf && (
                          <a
                            href={`/api/bills/${bill.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100"
                          >
                            PDF
                          </a>
                        )}

                        {bill.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailBill(bill);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW CUSTOMER */}
      {/* ========================================================================= */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FigmaIcon name="message" size={17} className="text-blue-600" />
                <span>Add New Customer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +919876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400">Used for WhatsApp / SMS invoices</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Address <small>(optional)</small>
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Flat 201, Kothrud, Pune"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCustomer}
                  className="btn btn-primary px-5 py-2 rounded-xl font-bold"
                >
                  {isAddingCustomer ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW BILL */}
      {/* ========================================================================= */}
      {previewBillData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Tax Invoice Preview
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {shopName || 'Retail Store'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBillData(null)}
                className="text-slate-400 hover:text-slate-900 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block">Billed To:</span>
                <b className="text-slate-900 dark:text-white block">{previewBillData.customer_name}</b>
                <span className="text-slate-500">{previewBillData.customer_phone}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Date:</span>
                <b>{previewBillData.date}</b>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              {previewBillData.items.map((it: VendorBillItem, i: number) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <div className="flex-1">
                    <b className="text-slate-900 dark:text-white block">{it.product_name}</b>
                    {it.barcode && <span className="text-[10px] text-slate-400 font-mono">{it.barcode}</span>}
                  </div>
                  <div className="w-28 text-center text-slate-500">
                    {it.qty} {it.unit} x ₹{it.unit_price}
                  </div>
                  <div className="w-20 text-right font-bold text-slate-900 dark:text-white">
                    ₹{it.line_total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{previewBillData.calculations.subtotal.toFixed(2)}</span>
              </div>
              {previewBillData.calculations.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{previewBillData.calculations.discount.toFixed(2)}</span>
                </div>
              )}
              {previewBillData.calculations.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax ({previewBillData.calculations.taxRate}%):</span>
                  <span>₹{previewBillData.calculations.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {previewBillData.calculations.delivery > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge:</span>
                  <span>₹{previewBillData.calculations.delivery.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Final Total:</span>
                <span className="text-blue-600">₹{previewBillData.calculations.finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewBillData(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewBillData(null);
                  handleSaveBill('finalized');
                }}
                className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl"
              >
                Confirm & Issue Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BILL DETAIL & ACTIONS */}
      {/* ========================================================================= */}
      {detailBill && !isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  {detailBill.bill_number}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {detailBill.customer_name} · ₹{detailBill.final_total.toFixed(2)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailBill(null)}
                className="text-slate-400 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                {detailBill.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  detailBill.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {detailBill.payment_status.toUpperCase()}
              </span>
              {detailBill.stock_deducted && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  Stock Deducted ✓
                </span>
              )}
            </div>

            {/* Items list */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <span className="font-bold text-slate-500 block mb-1">Items ({detailBill.items?.length || 0}):</span>
              {detailBill.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                  <span>• {it.product_name} ({it.qty} {it.unit})</span>
                  <b>₹{it.line_total.toFixed(2)}</b>
                </div>
              ))}
            </div>

            {/* Actions: Download PDF, Send, Pay, Cancel */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-bold">
              {detailBill.has_pdf && (
                <a
                  href={`/api/bills/${detailBill.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FigmaIcon name="download" size={14} />
                  <span>Download PDF</span>
                </a>
              )}

              <button
                type="button"
                onClick={async () => {
                  const ch = prompt('Send bill notification via:\nType "whatsapp" or "sms":', 'whatsapp');
                  if (ch) {
                    const res = await onSendBill(detailBill.id, ch.toLowerCase());
                    onShowToast(res.message || 'Notification dispatched.');
                    loadBillsHistory();
                  }
                }}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer"
              >
                <FigmaIcon name="whatsapp" size={14} />
                <span>Send via WhatsApp/SMS</span>
              </button>

              {detailBill.payment_status !== 'paid' && detailBill.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="py-2.5 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  Record Payment
                </button>
              )}

              {detailBill.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Cancel this bill and restore stock to inventory?')) return;
                    const res = await onCancelBill(detailBill.id);
                    if (res.success) {
                      onShowToast('Bill cancelled and stock restored.');
                      setDetailBill(null);
                      loadBillsHistory();
                    }
                  }}
                  className="py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1 cursor-pointer"
                >
                  Cancel & Restore Stock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && detailBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Record Payment for Bill #{detailBill.bill_number}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  placeholder={`Balance due: ₹${detailBill.balance_due.toFixed(2)}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const amt = parseFloat(paymentAmountInput);
                  if (isNaN(amt) || amt <= 0) {
                    onShowToast('Please enter a valid payment amount.');
                    return;
                  }
                  const res = await onRecordPayment(detailBill.id, amt, paymentMethodInput);
                  if (res.success && res.bill) {
                    onShowToast(`Payment of ₹${amt.toFixed(2)} recorded.`);
                    setDetailBill(res.bill);
                    setIsPaymentModalOpen(false);
                    setPaymentAmountInput('');
                    loadBillsHistory();
                  }
                }}
                className="btn btn-primary px-5 py-2 font-bold rounded-xl"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
