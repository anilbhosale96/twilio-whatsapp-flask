import React, { useState, useEffect, useCallback } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { AuthUser, ProductDiscoveryItem, OrderData, VendorBillData } from '../types';

interface CustomerDashboardProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  fetchPublicProducts: (params: {
    q?: string;
    category?: string;
    in_stock_only?: boolean;
    min_price?: number;
    max_price?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) => Promise<{
    success: boolean;
    products: ProductDiscoveryItem[];
    total: number;
    page: number;
    total_pages: number;
  }>;
  fetchCategories: () => Promise<Array<{ id: string; name: string; count: number }>>;
  onPlaceOrder?: (orderPayload: any, file?: File) => Promise<{ success: boolean; message?: string; order?: OrderData }>;
  onFetchOrders?: () => Promise<{ success: boolean; orders: OrderData[] }>;
  onApproveQuote?: (orderId: string) => Promise<{ success: boolean; message?: string; order?: OrderData }>;
  onCancelOrder?: (orderId: string, reason?: string) => Promise<{ success: boolean; message?: string; order?: OrderData }>;
  onFetchCustomerBills?: () => Promise<{ success: boolean; bills: VendorBillData[] }>;
  onFetchCustomerBillDetail?: (id: number) => Promise<{ success: boolean; bill?: VendorBillData | null }>;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_TABS = [
  { id: 'All', name: 'All Categories', icon: 'box' },
  { id: 'Grocery', name: 'Grocery', icon: 'bag' },
  { id: 'Pharmacy', name: 'Pharmacy', icon: 'warning' },
  { id: 'Stationery', name: 'Stationery', icon: 'edit' },
  { id: 'General Store', name: 'General Store', icon: 'inventory' },
];

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentUser,
  onLogout,
  isDark,
  onToggleDark,
  fetchPublicProducts,
  fetchCategories,
  onPlaceOrder,
  onFetchOrders,
  onApproveQuote,
  onCancelOrder,
  onFetchCustomerBills,
  onFetchCustomerBillDetail: _onFetchCustomerBillDetail,
  onShowToast
}) => {
  // Navigation: 'catalog' vs 'orders' vs 'bills'
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'bills'>('catalog');

  // Customer Bills State
  const [myBills, setMyBills] = useState<VendorBillData[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [selectedBillForModal, setSelectedBillForModal] = useState<VendorBillData | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('popular');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Products and categories data
  const [products, setProducts] = useState<ProductDiscoveryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected product modal for details
  const [selectedProduct, setSelectedProduct] = useState<ProductDiscoveryItem | null>(null);

  // Cart State: productId -> { product, qty }
  const [cart, setCart] = useState<Record<number, { product: ProductDiscoveryItem; qty: number }>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.address || currentUser?.city || 'Pune, MH');
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Custom Request / Upload Handwritten List State
  const [isCustomRequestOpen, setIsCustomRequestOpen] = useState(false);
  const [customRequestText, setCustomRequestText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Customer Orders State
  const [myOrders, setMyOrders] = useState<OrderData[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const cartItemsList = Object.values(cart);
  const totalCartCount = cartItemsList.reduce((acc, it) => acc + it.qty, 0);
  const cartSubtotal = cartItemsList.reduce((acc, it) => acc + (it.product.price || 0) * it.qty, 0);

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load category counts on mount
  useEffect(() => {
    let isMounted = true;
    fetchCategories().then((cats) => {
      if (!isMounted) return;
      const countMap: Record<string, number> = {};
      cats.forEach((c) => {
        countMap[c.id] = c.count;
      });
      setCategoryCounts(countMap);
    });
    return () => {
      isMounted = false;
    };
  }, [fetchCategories]);

  // Fetch products whenever filters change
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const minP = minPrice ? parseFloat(minPrice) : undefined;
      const maxP = maxPrice ? parseFloat(maxPrice) : undefined;

      const res = await fetchPublicProducts({
        q: debouncedQuery.trim() || undefined,
        category: selectedCategory,
        in_stock_only: inStockOnly,
        min_price: isNaN(minP as any) ? undefined : minP,
        max_price: isNaN(maxP as any) ? undefined : maxP,
        sort: sortBy,
        page,
        limit: 16
      });

      if (res.success) {
        setProducts(res.products);
        setTotalCount(res.total);
        setTotalPages(res.total_pages);
      } else {
        setErrorMsg('Unable to retrieve products. Please check your network connection.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading store products.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory, inStockOnly, minPrice, maxPrice, sortBy, page, fetchPublicProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load customer orders
  const loadOrders = useCallback(async () => {
    if (!onFetchOrders) return;
    setIsLoadingOrders(true);
    try {
      const res = await onFetchOrders();
      if (res.success) {
        setMyOrders(res.orders);
      }
    } finally {
      setIsLoadingOrders(false);
    }
  }, [onFetchOrders]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Load customer bills
  const loadBills = useCallback(async () => {
    if (!onFetchCustomerBills) return;
    setIsLoadingBills(true);
    try {
      const res = await onFetchCustomerBills();
      if (res.success) {
        setMyBills(res.bills || []);
      }
    } finally {
      setIsLoadingBills(false);
    }
  }, [onFetchCustomerBills]);

  useEffect(() => {
    if (activeTab === 'bills') {
      loadBills();
    }
  }, [activeTab, loadBills]);

  // Cart operations
  const handleAddToCart = (product: ProductDiscoveryItem) => {
    setCart((prev) => {
      const existing = prev[product.id];
      const newQty = existing ? existing.qty + 1 : 1;
      return {
        ...prev,
        [product.id]: { product, qty: newQty }
      };
    });
    if (onShowToast) onShowToast(`Added "${product.name}" to cart`);
  };

  const handleUpdateCartQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: { ...existing, qty: newQty }
      };
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('All');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('popular');
    setPage(1);
  };

  // Submit Cart Order
  const handleCheckoutCart = async () => {
    if (!onPlaceOrder || cartItemsList.length === 0) return;
    setIsPlacingOrder(true);
    try {
      // Group by vendor phone or send to first item's vendor
      const vendorPhone = cartItemsList[0].product.store?.phone_masked ? cartItemsList[0].product.store.phone_masked : '+919876543210';
      const itemsPayload = cartItemsList.map((ci) => ({
        item_id: ci.product.id,
        product_name: ci.product.name,
        qty: ci.qty,
        unit: ci.product.unit,
        unit_price: ci.product.price
      }));

      const res = await onPlaceOrder({
        vendor_phone: vendorPhone,
        customer_name: currentUser?.name || 'Customer',
        customer_phone: currentUser?.phone,
        customer_address: deliveryAddress,
        request_type: 'cart',
        items: itemsPayload,
        notes: orderNotes
      });

      if (res.success) {
        setCart({});
        setIsCartOpen(false);
        setActiveTab('orders');
        loadOrders();
        if (onShowToast) onShowToast(`Order placed successfully! Order ID: ${res.order?.id}`);
      } else {
        if (onShowToast) onShowToast(res.message || 'Failed to place order.');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // File Upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setFilePreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleCustomRequestSubmit = async () => {
    if (!onPlaceOrder) return;
    if (!customRequestText.trim() && !selectedFile) {
      if (onShowToast) onShowToast('Please enter text notes or attach a photo.');
      return;
    }
    setIsSubmittingCustom(true);
    try {
      const res = await onPlaceOrder(
        {
          vendor_phone: '+919876543210',
          customer_name: currentUser?.name || 'Customer',
          customer_phone: currentUser?.phone,
          customer_address: deliveryAddress,
          request_type: selectedFile ? 'image_list' : 'custom_text',
          raw_text: customRequestText.trim() || undefined,
          notes: orderNotes
        },
        selectedFile || undefined
      );

      if (res.success) {
        setCustomRequestText('');
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setIsCustomRequestOpen(false);
        setActiveTab('orders');
        loadOrders();
        if (onShowToast) onShowToast(`Custom request placed! Order ID: ${res.order?.id}`);
      } else {
        if (onShowToast) onShowToast(res.message || 'Failed to submit request.');
      }
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
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

  return (
    <div className="customer-dashboard min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0b1120] text-[#1e293b] dark:text-[#f1f5f9] transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#e2e8f0] dark:border-[#1e293b] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FigmaIcon name="box" size={17} />
              </span>
              <span className="font-extrabold text-base tracking-tight text-[#17213a] dark:text-white">
                SmartStock <b className="text-blue-600 dark:text-blue-400">AI</b>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Customer Portal
            </span>
          </div>

          {/* Navigation Pill (Browse Catalog vs My Orders vs Bills & History) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Explore Products
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>My Orders</span>
              {myOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-extrabold">
                  {myOrders.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bills'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Bills & Invoices</span>
              {myBills.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-extrabold">
                  {myBills.length}
                </span>
              )}
            </button>
          </div>

          {/* Right Actions: Custom Request + Cart + Theme + Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Custom Request Button */}
            <button
              type="button"
              onClick={() => setIsCustomRequestOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <FigmaIcon name="camera" size={14} />
              <span>Upload List / Notes</span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer shadow-xs flex items-center gap-1.5"
              title="View Cart"
            >
              <FigmaIcon name="bag" size={16} />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#162032] text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <FigmaIcon name={isDark ? 'sun' : 'moon'} size={16} className={isDark ? 'text-amber-400' : ''} />
            </button>

            {/* User Profile Chip */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'C'}
              </span>
              <div className="leading-tight text-left">
                <b className="block text-[#17213a] dark:text-[#f8fafc] font-semibold text-xs">
                  {currentUser?.name || 'Customer'}
                </b>
                <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                  📍 {currentUser?.city || 'Pune, MH'}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#162032] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-xs font-semibold text-[#58657d] dark:text-[#94a3b8] transition-colors cursor-pointer"
              title="Logout"
            >
              <FigmaIcon name="logout" size={14} />
              <span className="hidden sm:inline ml-1">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6 flex-1">
        {activeTab === 'orders' ? (
          /* ========================================================================= */
          /* CUSTOMER ORDERS TAB */
          /* ========================================================================= */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>My Store Orders & Quotes</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
                    {myOrders.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track live status, review shopkeeper quotations, and download official invoices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadOrders}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <FigmaIcon name="refresh" size={13} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomRequestOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  + New Request / Upload List
                </button>
              </div>
            </div>

            {isLoadingOrders ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading your orders...</div>
            ) : myOrders.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <span className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <FigmaIcon name="bag" size={24} />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">You haven't placed any orders yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse products from local shops or upload a handwritten grocery list to receive a quick quotation.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Catalog Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myOrders.map((order) => {
                  const hasBills = order.bills && order.bills.length > 0;
                  const latestBill = hasBills ? order.bills[0] : null;

                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {order.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getOrderStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div>
                          <b className="text-sm font-bold text-slate-900 dark:text-white block">
                            🏪 {order.vendor?.name || 'Local Store'}
                          </b>
                          <span className="text-[11px] text-slate-500">
                            Ordered: {new Date(order.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Items preview */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                            <span>{order.items?.length || 0} items requested</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              Total: ₹{order.total_amount ? order.total_amount.toFixed(2) : '0.00'}
                            </span>
                          </div>

                          {order.raw_text && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2">
                              “{order.raw_text}”
                            </p>
                          )}

                          <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            {order.items?.map((it, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span className="truncate max-w-[200px]">• {it.product_name}</span>
                                <span>
                                  {it.qty} {it.unit} {it.unit_price ? `· ₹${it.unit_price}` : '(Price Pending)'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Actions: Approve Quote / Download Bill */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {latestBill?.has_pdf ? (
                          <a
                            href={`/api/orders/${order.id}/download-pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 shadow-xs"
                          >
                            <FigmaIcon name="download" size={13} />
                            <span>Download {latestBill.bill_type === 'invoice' ? 'Invoice' : 'Quotation'} (PDF)</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">PDF awaiting generation</span>
                        )}

                        <div className="flex items-center gap-2">
                          {(order.status === 'Quote Sent' || order.status === 'Awaiting Customer Approval') && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!onApproveQuote) return;
                                const res = await onApproveQuote(order.id);
                                if (res.success) {
                                  if (onShowToast) onShowToast('Quotation approved! Order confirmed.');
                                  loadOrders();
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                            >
                              ✓ Approve Quote
                            </button>
                          )}

                          {order.status !== 'Completed' && order.status !== 'Cancelled' && onCancelOrder && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to cancel this order?')) return;
                                const res = await onCancelOrder(order.id, 'Cancelled by customer');
                                if (res.success) {
                                  if (onShowToast) onShowToast('Order cancelled.');
                                  loadOrders();
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'bills' ? (
          /* ========================================================================= */
          /* CUSTOMER BILLS & HISTORY TAB */
          /* ========================================================================= */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>My Bills & Invoices</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                    {myBills.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Access official invoices, receipts, and itemized billing history from local vendors.
                </p>
              </div>

              <button
                type="button"
                onClick={loadBills}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <FigmaIcon name="refresh" size={13} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingBills ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading your bills...</div>
            ) : myBills.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <span className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <FigmaIcon name="receipt" size={24} />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No bills or invoices yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you purchase items or approve quotations from neighborhood shops, your bills and receipts will be stored here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Store Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between hover:border-blue-400 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {bill.bill_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          bill.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : bill.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {bill.status}
                        </span>
                      </div>

                      <div>
                        <b className="text-sm font-bold text-slate-900 dark:text-white block">
                          🏪 {bill.vendor_name || 'Neighborhood Store'}
                        </b>
                        <span className="text-[11px] text-slate-500">
                          Date: {new Date(bill.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                          <span>{bill.items?.length || 0} line items</span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            Total: ₹{Number(bill.grand_total || 0).toFixed(2)}
                          </span>
                        </div>
                        {bill.amount_paid > 0 && (
                          <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                            <span>Paid:</span>
                            <span>₹{Number(bill.amount_paid).toFixed(2)}</span>
                          </div>
                        )}
                        {bill.balance_due > 0 && (
                          <div className="flex justify-between text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                            <span>Balance Due:</span>
                            <span>₹{Number(bill.balance_due).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBillForModal(bill)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        View Items
                      </button>

                      <a
                        href={`/api/bills/${bill.id}/pdf${bill.access_token ? `?token=${encodeURIComponent(bill.access_token)}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <FigmaIcon name="download" size={13} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* PRODUCT CATALOG TAB */
          /* ========================================================================= */
          <>
            {/* Hero Banner */}
            <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md tracking-wide">
                  LIVE LOCAL SHOP INVENTORY
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Instant Kirana Discovery & Direct Store Orders
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                  Real-time stock from registered neighborhood shops. Order products directly, or upload handwritten notes for automatic pricing.
                </p>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCustomRequestOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <FigmaIcon name="camera" size={15} />
                    <span>Upload Shopping List / Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md cursor-pointer flex items-center gap-1.5"
                  >
                    <FigmaIcon name="bag" size={15} />
                    <span>View Cart ({totalCartCount})</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Category Pills */}
            <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map((cat) => {
                const count = categoryCounts[cat.id] ?? (cat.id === 'All' ? totalCount : 0);
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPage(1);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-[#162032] border border-[#e2e8f0] dark:border-[#1e293b] text-[#475569] dark:text-[#94a3b8] hover:border-blue-400'
                    }`}
                  >
                    <FigmaIcon name={cat.icon as any} size={15} />
                    <span>{cat.name}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-blue-700 text-white' : 'bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>

            {/* Search and Filters Bar */}
            <section className="p-4 rounded-2xl bg-white dark:bg-[#162032] border border-[#e2e8f0] dark:border-[#1e293b] shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name, brand, or store..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-xs font-medium text-[#1e293b] dark:text-[#f8fafc] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute left-3.5 top-3 text-[#94a3b8]">
                    <FigmaIcon name="search" size={16} />
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-[#94a3b8] hover:text-[#475569] text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                  {/* In Stock Only Toggle */}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        setPage(1);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>In Stock Only</span>
                  </label>

                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-xs font-semibold text-[#334155] dark:text-[#cbd5e1] cursor-pointer"
                  >
                    <option value="popular">Popular First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Name: A to Z</option>
                  </select>

                  {/* Clear Filters */}
                  {(searchQuery || selectedCategory !== 'All' || inStockOnly || minPrice || maxPrice) && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Product Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64748b] dark:text-[#94a3b8] font-medium">
                <span>
                  Showing <b>{products.length}</b> of <b>{totalCount}</b> products
                </span>
                <span>Page {page} of {totalPages}</span>
              </div>

              {errorMsg ? (
                <div className="p-8 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium space-y-2">
                  <p>{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => loadProducts()}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                  >
                    Retry
                  </button>
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#162032] space-y-3 animate-pulse"
                    >
                      <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#162032] space-y-3">
                  <span className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <FigmaIcon name="search" size={24} />
                  </span>
                  <h3 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc]">No matching products found</h3>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-sm mx-auto">
                    Try different keywords, adjust price filters, or submit a custom list request for manual shopkeeper pricing.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn btn-primary px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {products.map((p) => {
                    const cartItem = cart[p.id];
                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#162032] shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          {/* Image Container */}
                          <div
                            onClick={() => setSelectedProduct(p)}
                            className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 cursor-pointer"
                          >
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs">
                              {p.category}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <h3
                              onClick={() => setSelectedProduct(p)}
                              className="font-bold text-sm text-[#0f172a] dark:text-[#f8fafc] truncate cursor-pointer hover:text-blue-600"
                              title={p.name}
                            >
                              {p.name}
                            </h3>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#64748b] dark:text-[#94a3b8]">Unit: {p.unit}</span>
                              {p.is_in_stock ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ In Stock
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-500">
                                  Out of Stock
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate">
                              🏪 <b>{p.store?.name}</b> · {p.store?.location}
                            </p>
                          </div>
                        </div>

                        {/* Price & Add to Cart Action */}
                        <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-[#1e293b] flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] block leading-none">Price</span>
                            <span className="text-base font-extrabold text-[#0f172a] dark:text-[#f8fafc]">
                              {p.price_formatted}
                            </span>
                          </div>

                          {cartItem ? (
                            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(p.id, -1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 text-blue-600 font-bold flex items-center justify-center text-xs shadow-xs"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 px-1">
                                {cartItem.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(p.id, 1)}
                                className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(p)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <FigmaIcon name="bag" size={13} />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    ‹ Previous
                  </button>
                  <span className="text-xs font-bold px-3 py-1">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* CART DRAWER / SIDEBAR */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FigmaIcon name="bag" size={18} className="text-blue-600" />
                  <span>Your Shopping Cart ({totalCartCount})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Items List */}
              {cartItemsList.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <p>Your cart is empty.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="text-blue-600 font-bold underline"
                  >
                    Browse products to add items
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 py-4 space-y-3">
                  {cartItemsList.map(({ product, qty }) => (
                    <div key={product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 flex-1">
                        <b className="text-slate-900 dark:text-white block">{product.name}</b>
                        <span className="text-[11px] text-slate-400">
                          {product.price_formatted} · {product.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(product.id, -1)}
                          className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(product.id, 1)}
                          className="w-6 h-6 rounded bg-blue-600 text-white font-bold"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(product.id)}
                          className="ml-2 text-slate-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery & Checkout */}
            {cartItemsList.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter flat / house #, street, city"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Order Notes <small>(optional)</small>
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Ring the bell, deliver by 6 PM"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs font-bold">
                  <span>Estimated Total:</span>
                  <span className="text-base text-blue-600 dark:text-blue-400">
                    ₹{cartSubtotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isPlacingOrder}
                  onClick={handleCheckoutCart}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <FigmaIcon name="check" size={16} />
                  <span>{isPlacingOrder ? 'Sending Order...' : 'Place Order Now'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM REQUEST & HANDWRITTEN LIST UPLOAD MODAL */}
      {/* ========================================================================= */}
      {isCustomRequestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FigmaIcon name="camera" size={18} className="text-indigo-600" />
                <span>Upload Shopping List or Notes</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomRequestOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Write items in free-text (e.g. <i>"2 packet milk, 1 loaf bread, 1kg sugar"</i>) or take a picture of your handwritten shopping note. The shopkeeper will review, check stock, and send a quotation.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type Items / Shopping Notes
                </label>
                <textarea
                  rows={3}
                  value={customRequestText}
                  onChange={(e) => setCustomRequestText(e.target.value)}
                  placeholder="e.g. 2 Parle G, 1 Tata Salt, 500g paneer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Photo of List / Receipt <small>(optional)</small>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {filePreviewUrl && (
                  <div className="mt-2 max-h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={filePreviewUrl} alt="Preview" className="h-32 w-full object-contain bg-slate-100 dark:bg-slate-800" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomRequestOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCustom}
                onClick={handleCustomRequestSubmit}
                className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isSubmittingCustom ? 'Submitting...' : 'Send Request to Shop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162032] rounded-3xl border border-[#e2e8f0] dark:border-[#1e293b] w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e293b] pb-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedProduct.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="h-44 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedProduct.name}</h3>
              <p className="text-xs text-slate-500">Unit: {selectedProduct.unit} · Stock: {selectedProduct.qty} available</p>
              <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {selectedProduct.price_formatted}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <b>🏪 {selectedProduct.store?.name}</b>
              <p className="text-slate-500">Contact: {selectedProduct.store?.phone_masked} · {selectedProduct.store?.location}</p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <FigmaIcon name="bag" size={14} />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBillForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#162032] rounded-3xl border border-[#e2e8f0] dark:border-[#1e293b] w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] dark:border-[#1e293b] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  {selectedBillForModal.bill_number}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Invoice from {selectedBillForModal.vendor_name || 'Store'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBillForModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Date: {new Date(selectedBillForModal.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="uppercase font-bold text-emerald-600">{selectedBillForModal.status}</span>
              </div>
              {selectedBillForModal.vendor_address && (
                <p className="text-slate-500">Address: {selectedBillForModal.vendor_address}</p>
              )}
            </div>

            {/* Line items table */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedBillForModal.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                        {it.product_name}
                        {it.barcode && <span className="block text-[10px] text-slate-400 font-mono">[{it.barcode}]</span>}
                      </td>
                      <td className="p-2.5 text-center">{it.quantity} {it.unit}</td>
                      <td className="p-2.5 text-right">₹{Number(it.unit_price).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold">₹{Number(it.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary breakdown */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span>₹{Number(selectedBillForModal.subtotal || 0).toFixed(2)}</span>
              </div>
              {(selectedBillForModal.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{Number(selectedBillForModal.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {(selectedBillForModal.tax_amount ?? 0) > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST / Tax:</span>
                  <span>+₹{Number(selectedBillForModal.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>Grand Total:</span>
                <span>₹{Number(selectedBillForModal.grand_total || 0).toFixed(2)}</span>
              </div>
              {selectedBillForModal.amount_paid > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Amount Paid:</span>
                  <span>₹{Number(selectedBillForModal.amount_paid).toFixed(2)}</span>
                </div>
              )}
              {selectedBillForModal.balance_due > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                  <span>Balance Due:</span>
                  <span>₹{Number(selectedBillForModal.balance_due).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedBillForModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <a
                href={`/api/bills/${selectedBillForModal.id}/pdf${selectedBillForModal.access_token ? `?token=${encodeURIComponent(selectedBillForModal.access_token)}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <FigmaIcon name="download" size={13} />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
