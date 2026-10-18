import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SummaryData,
  InventoryItem,
  TransactionItem,
  AlertsData,
  ReportsData,
  VendorSettings,
  ChatMessage,
  AuthUser,
  ProductDiscoveryItem,
  OrderData,
  CustomerRecord,
  VendorBillData,
  BarcodeDecodeResult
} from '../types';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export function useLiveDashboard() {
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('smartstock_token');
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('smartstock_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [reportRange, setReportRange] = useState<string>('today');
  const [settings, setSettings] = useState<VendorSettings | null>(null);
  const [chatPreview, setChatPreview] = useState<{ latest: ChatMessage | null; history: ChatMessage[] }>({
    latest: null,
    history: []
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const getAuthHeaders = useCallback((extra: Record<string, string> = {}): Record<string, string> => {
    const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('smartstock_token') : null);
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...extra
    };
  }, [authToken]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/summary?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setSummary(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchInventory = useCallback(async (search?: string, lowOnly?: boolean) => {
    try {
      let url = `/api/inventory?_t=${Date.now()}`;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowOnly) params.append('low_only', 'true');
      if (params.toString()) url += `&${params.toString()}`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setInventory(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchTransactions = useCallback(async (type?: string, search?: string) => {
    try {
      let url = `/api/transactions?limit=100&_t=${Date.now()}`;
      if (type && type !== 'all') url += `&type=${type}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.items || []);
      }
    } catch {}
  }, [getAuthHeaders]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setAlerts(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchReports = useCallback(async (range: string = 'today') => {
    try {
      const res = await fetch(`/api/reports?range=${range}&_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setReports(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setSettings(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchChatPreview = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat-preview?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setChatPreview(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const refreshAll = useCallback(async () => {
    if (currentUser?.role === 'customer') {
      setStatus('connected');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSummary(),
        fetchInventory(),
        fetchTransactions(),
        fetchAlerts(),
        fetchReports(reportRange),
        fetchSettings(),
        fetchChatPreview()
      ]);
      setStatus('connected');
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server');
      setStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role, fetchSummary, fetchInventory, fetchTransactions, fetchAlerts, fetchReports, reportRange, fetchSettings, fetchChatPreview]);

  // Login handler
  const login = async (phone: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          message: !res.ok
            ? `Server error (${res.status}): Please verify the backend server is running on port 8000.`
            : 'Invalid server response format'
        };
      }

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Login failed' };
      }
      const vendorUser: AuthUser = {
        ...data.vendor,
        role: 'vendor'
      };
      localStorage.setItem('smartstock_token', data.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(vendorUser));
      setAuthToken(data.access_token);
      setCurrentUser(vendorUser);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || '';
      return {
        success: false,
        message: msg.includes('JSON') || msg.includes('Unexpected')
          ? 'Backend server not responding or proxy error. Please verify the backend is running.'
          : (msg || 'Unable to connect to server.')
      };
    }
  };

  // Register handler (Vendor)
  const register = async (regData: {
    phone: string;
    password: string;
    owner_name: string;
    shop_name: string;
    category?: string;
    email?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          message: !res.ok
            ? `Server error (${res.status}): Please verify the backend server is running on port 8000.`
            : 'Invalid server response format'
        };
      }

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Registration failed' };
      }
      const vendorUser: AuthUser = {
        ...data.vendor,
        role: 'vendor'
      };
      localStorage.setItem('smartstock_token', data.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(vendorUser));
      setAuthToken(data.access_token);
      setCurrentUser(vendorUser);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || '';
      return {
        success: false,
        message: msg.includes('JSON') || msg.includes('Unexpected')
          ? 'Backend server not responding or proxy error. Please verify the backend is running.'
          : (msg || 'Unable to connect to server.')
      };
    }
  };

  // Customer Login Handler
  const loginCustomer = async (phone: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Customer login failed' };
      }

      const custUser: AuthUser = {
        phone: data.customer?.phone || data.user?.phone,
        name: data.customer?.name || data.user?.name,
        email: data.customer?.email || data.user?.email,
        city: data.customer?.city || data.user?.city,
        address: data.customer?.address || data.user?.address,
        role: 'customer'
      };

      localStorage.setItem('smartstock_token', data.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(custUser));
      setAuthToken(data.access_token);
      setCurrentUser(custUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Server connection error' };
    }
  };

  // Customer Registration Handler
  const registerCustomer = async (data: {
    phone: string;
    password: string;
    name: string;
    email?: string;
    city?: string;
    address?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const body = await res.json();
      if (!res.ok) {
        return { success: false, message: body.detail || 'Customer registration failed' };
      }

      const custUser: AuthUser = {
        phone: body.customer?.phone || body.user?.phone,
        name: body.customer?.name || body.user?.name,
        email: body.customer?.email || body.user?.email,
        city: body.customer?.city || body.user?.city,
        address: body.customer?.address || body.user?.address,
        role: 'customer'
      };

      localStorage.setItem('smartstock_token', body.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(custUser));
      setAuthToken(body.access_token);
      setCurrentUser(custUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Server connection error' };
    }
  };

  // Public Product Search & Discovery
  const fetchPublicProducts = async (params: {
    q?: string;
    category?: string;
    in_stock_only?: boolean;
    min_price?: number;
    max_price?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    products: ProductDiscoveryItem[];
    total: number;
    page: number;
    total_pages: number;
  }> => {
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.append('q', params.q);
      if (params.category && params.category !== 'All') qs.append('category', params.category);
      if (params.in_stock_only) qs.append('in_stock_only', 'true');
      if (params.min_price !== undefined && params.min_price !== null) qs.append('min_price', String(params.min_price));
      if (params.max_price !== undefined && params.max_price !== null) qs.append('max_price', String(params.max_price));
      if (params.sort) qs.append('sort', params.sort);
      if (params.page) qs.append('page', String(params.page));
      if (params.limit) qs.append('limit', String(params.limit));

      const res = await fetch(`/api/products?${qs.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { success: false, products: [], total: 0, page: 1, total_pages: 1 };
  };

  // Product Categories List
  const fetchCategories = async (): Promise<Array<{ id: string; name: string; count: number }>> => {
    try {
      const res = await fetch('/api/products/categories');
      if (res.ok) {
        const data = await res.json();
        return data.categories || [];
      }
    } catch {}
    return [];
  };

  // Logout handler
  const logout = () => {
    try {
      localStorage.removeItem('smartstock_token');
      localStorage.removeItem('smartstock_user');
    } catch {}
    setAuthToken(null);
    setCurrentUser(null);
    setInventory([]);
    setTransactions([]);
    setSummary(null);
    setAlerts(null);
    setReports(null);
  };

  // Add a new inventory item
  const addItem = async (data: {
    name: string;
    unit?: string;
    qty?: number;
    threshold?: number;
    price?: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { success: false, message: `Server error (${res.status})` };
      }

      const result = await res.json();
      if (!res.ok) {
        return { success: false, message: result.detail || 'Failed to add item' };
      }
      if (result.item) {
        setInventory((prev) => [result.item, ...prev]);
      }
      await Promise.all([
        fetchInventory(),
        fetchAlerts(),
        fetchSummary(),
        fetchTransactions(),
        fetchReports(reportRange)
      ]);
      return { success: true, message: result.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error' };
    }
  };

  // Delete an inventory item
  const deleteItem = async (id: number): Promise<boolean> => {
    // Optimistic deletion
    setInventory((prev) => prev.filter((it) => it.id !== id));
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await Promise.all([
          fetchInventory(),
          fetchAlerts(),
          fetchSummary(),
          fetchTransactions(),
          fetchReports(reportRange)
        ]);
        return true;
      }
    } catch {}
    fetchInventory();
    return false;
  };

  // Patch an inventory item
  const patchItem = async (
    id: number,
    patch: {
      name?: string;
      unit?: string;
      qty?: number;
      threshold?: number;
      price?: number;
      reordered?: boolean;
    }
  ) => {
    // Instant optimistic update
    setInventory((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        await Promise.all([
          fetchInventory(),
          fetchAlerts(),
          fetchSummary(),
          fetchTransactions(),
          fetchReports(reportRange)
        ]);
        return true;
      }
    } catch {}
    fetchInventory();
    return false;
  };

  // Update Settings
  const updateVendorSettings = async (data: {
    name?: string;
    shop_name?: string;
    default_threshold?: number;
    language?: string;
  }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const body = await res.json();
        if (body.settings) {
          setSettings(body.settings);
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const updatedUser = {
              ...prev,
              name: body.settings.name || prev.name,
              shop_name: body.settings.shop_name || prev.shop_name
            };
            try {
              localStorage.setItem('smartstock_user', JSON.stringify(updatedUser));
            } catch {}
            return updatedUser;
          });
        }
        await Promise.all([fetchSettings(), fetchSummary()]);
        return true;
      }
    } catch {}
    return false;
  };

  // Send a simulated WhatsApp message
  const sendSimulationMessage = async (text: string) => {
    try {
      const formData = new URLSearchParams();
      let phoneToSend = currentUser?.phone || settings?.phone_raw || 'whatsapp:+919876543210';
      if (!phoneToSend.startsWith('whatsapp:')) {
        const digits = phoneToSend.replace(/\D/g, '');
        phoneToSend = `whatsapp:+${digits.length === 10 ? '91' + digits : digits}`;
      }
      formData.append('From', phoneToSend);
      formData.append('Body', text);
      formData.append('NumMedia', '0');

      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (res.ok) {
        await refreshAll();
        return true;
      }
    } catch {}
    return false;
  };

  // Direct message sending for automatic inventory update (WhatsApp or SMS)
  const sendDirectMessage = async (text: string, channel: 'whatsapp' | 'sms' = 'whatsapp') => {
    try {
      let phoneToSend = currentUser?.phone || settings?.phone_raw || 'whatsapp:+919876543210';
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          channel: channel,
          vendor: phoneToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        await refreshAll();
        return { success: true, reply: data.reply as string, parsed_items: data.parsed_items };
      }
    } catch {}
    return { success: false, reply: 'Failed to process message' };
  };

  // --- Customer Ordering Methods ---
  const placeCustomerOrder = useCallback(async (orderPayload: any, file?: File) => {
    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('order_data', JSON.stringify(orderPayload));
        res = await fetch('/api/customer/orders', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
      } else {
        res = await fetch('/api/customer/orders', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(orderPayload)
        });
      }
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error placing order' };
    }
  }, [getAuthHeaders]);

  const fetchCustomerOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/orders?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, orders: (data.orders || []) as OrderData[] };
      }
    } catch {}
    return { success: false, orders: [] as OrderData[] };
  }, [getAuthHeaders]);

  const approveCustomerQuote = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const cancelCustomerOrder = useCallback(async (orderId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reason: reason || 'Cancelled by customer' })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  // --- Vendor Orders Workspace Methods ---
  const fetchVendorOrders = useCallback(async (statusFilter?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      const url = `/api/vendor/orders?_t=${Date.now()}${params.toString() ? '&' + params.toString() : ''}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, orders: (data.orders || []) as OrderData[] };
      }
    } catch {}
    return { success: false, orders: [] as OrderData[] };
  }, [getAuthHeaders]);

  const fetchVendorOrderDetail = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, order: data.order as OrderData };
      }
    } catch {}
    return { success: false, order: null };
  }, [getAuthHeaders]);

  const updateVendorOrderItems = useCallback(async (orderId: string, items: any[], notes?: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/items`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ items, notes })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const sendVendorQuote = useCallback(async (
    orderId: string,
    payload: { discount: number; tax_rate: number; delivery_charge: number; notes?: string }
  ) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/send-quote`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData, bill_number: data.bill_number };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const generateVendorBill = useCallback(async (
    orderId: string,
    payload: { bill_type: string; discount: number; tax_rate: number; delivery_charge: number; payment_method?: string; notes?: string }
  ) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/generate-bill`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData, bill_number: data.bill_number };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const updateVendorOrderStatus = useCallback(async (orderId: string, newStatus: string, notes?: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/update-status`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus, notes })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const markVendorOrderPaid = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, order: data.order as OrderData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  // --- Barcode & Quick Add Methods ---
  const decodeBarcodeImage = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/barcode/decode', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      return data as { success: boolean; message: string; barcodes: BarcodeDecodeResult[]; primary_barcode?: string };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to decode barcode', barcodes: [] };
    }
  }, [getAuthHeaders]);

  const searchProductByBarcode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/vendor/inventory/barcode/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { found: false, message: 'Network error' };
  }, [getAuthHeaders]);

  const quickAddInventoryProduct = useCallback(async (formData: FormData) => {
    try {
      const res = await fetch('/api/vendor/inventory/quick-add', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        fetchInventory();
        fetchSummary();
      }
      return { success: res.ok, message: data.message || data.detail, item: data.item };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders, fetchInventory, fetchSummary]);

  // --- Customer Selection for Vendor ---
  const fetchVendorCustomers = useCallback(async (query?: string) => {
    try {
      const url = query ? `/api/vendor/customers?q=${encodeURIComponent(query)}` : '/api/vendor/customers';
      const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, customers: (data.customers || []) as CustomerRecord[] };
      }
    } catch {}
    return { success: false, customers: [] as CustomerRecord[] };
  }, [getAuthHeaders]);

  const createVendorCustomer = useCallback(async (custData: { name: string; phone: string; address?: string; city?: string; email?: string }) => {
    try {
      const res = await fetch('/api/vendor/customers', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(custData)
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, customer: data.customer as CustomerRecord };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  // --- Vendor Billing Workspace Methods ---
  const createVendorBill = useCallback(async (payload: any) => {
    try {
      const res = await fetch('/api/vendor/bills', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && payload.status === 'finalized') {
        fetchInventory();
        fetchSummary();
        fetchTransactions();
      }
      return { success: res.ok, message: data.message || data.detail, bill: data.bill as VendorBillData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders, fetchInventory, fetchSummary, fetchTransactions]);

  const fetchVendorBills = useCallback(async (statusFilter?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      const url = `/api/vendor/bills?_t=${Date.now()}${params.toString() ? '&' + params.toString() : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, total: data.total, bills: (data.bills || []) as VendorBillData[] };
      }
    } catch {}
    return { success: false, total: 0, bills: [] as VendorBillData[] };
  }, [getAuthHeaders]);

  const fetchVendorBillDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/vendor/bills/${id}?_t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, bill: data.bill as VendorBillData };
      }
    } catch {}
    return { success: false, bill: null };
  }, [getAuthHeaders]);

  const finalizeVendorBill = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/vendor/bills/${id}/finalize`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        fetchInventory();
        fetchSummary();
        fetchTransactions();
      }
      return { success: res.ok, message: data.message || data.detail, bill: data.bill as VendorBillData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders, fetchInventory, fetchSummary, fetchTransactions]);

  const sendVendorBill = useCallback(async (id: number, channel: string, recipientPhone?: string) => {
    try {
      const res = await fetch(`/api/vendor/bills/${id}/send`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ channel, recipient_phone: recipientPhone })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, status: data.status, bill: data.bill as VendorBillData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const recordBillPayment = useCallback(async (id: number, amount: number, paymentMethod: string, notes?: string) => {
    try {
      const res = await fetch(`/api/vendor/bills/${id}/payment`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount, payment_method: paymentMethod, notes })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.detail, bill: data.bill as VendorBillData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders]);

  const cancelVendorBill = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/vendor/bills/${id}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        fetchInventory();
        fetchSummary();
        fetchTransactions();
      }
      return { success: res.ok, message: data.message || data.detail, bill: data.bill as VendorBillData };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  }, [getAuthHeaders, fetchInventory, fetchSummary, fetchTransactions]);

  // --- Customer Bills & History Methods ---
  const fetchCustomerBills = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/bills?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, bills: (data.bills || []) as VendorBillData[] };
      }
    } catch {}
    return { success: false, bills: [] as VendorBillData[] };
  }, [getAuthHeaders]);

  const fetchCustomerBillDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/customer/bills/${id}?_t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, bill: data.bill as VendorBillData };
      }
    } catch {}
    return { success: false, bill: null };
  }, [getAuthHeaders]);

  // Setup Server-Sent Events (SSE)
  useEffect(() => {
    refreshAll();

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('smartstock_token') : null);
      const streamUrl = token ? `/api/stream?token=${encodeURIComponent(token)}` : '/api/stream';
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus('connected');
        setError(null);
      };

      const handleDataUpdate = () => {
        fetchSummary();
        fetchInventory();
        fetchTransactions();
        fetchAlerts();
        fetchReports(reportRange);
        fetchChatPreview();
        fetchSettings();
      };

      es.onmessage = handleDataUpdate;
      es.addEventListener('update', handleDataUpdate);
      es.addEventListener('data_updated', handleDataUpdate);
      es.addEventListener('settings_updated', handleDataUpdate);

      es.addEventListener('chat_preview', () => {
        fetchChatPreview();
      });

      es.onerror = () => {
        setStatus('reconnecting');
        es.close();
        setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [authToken, refreshAll, fetchSummary, fetchInventory, fetchTransactions, fetchAlerts, fetchReports, reportRange, fetchChatPreview, fetchSettings]);

  return {
    status,
    loading,
    error,
    summary,
    inventory,
    transactions,
    alerts,
    reports,
    reportRange,
    setReportRange: (r: string) => {
      setReportRange(r);
      fetchReports(r);
    },
    settings,
    chatPreview,
    currentUser,
    isLoggedIn: Boolean(authToken),
    login,
    register,
    loginCustomer,
    registerCustomer,
    logout,
    refreshAll,
    fetchPublicProducts,
    fetchCategories,
    placeCustomerOrder,
    fetchCustomerOrders,
    approveCustomerQuote,
    cancelCustomerOrder,
    fetchVendorOrders,
    fetchVendorOrderDetail,
    updateVendorOrderItems,
    sendVendorQuote,
    generateVendorBill,
    updateVendorOrderStatus,
    markVendorOrderPaid,
    decodeBarcodeImage,
    searchProductByBarcode,
    quickAddInventoryProduct,
    fetchVendorCustomers,
    createVendorCustomer,
    createVendorBill,
    fetchVendorBills,
    fetchVendorBillDetail,
    finalizeVendorBill,
    sendVendorBill,
    recordBillPayment,
    cancelVendorBill,
    fetchCustomerBills,
    fetchCustomerBillDetail,
    addItem,
    deleteItem,
    patchItem,
    updateVendorSettings,
    sendSimulationMessage,
    sendDirectMessage,
    fetchInventory,
    fetchTransactions
  };
}
