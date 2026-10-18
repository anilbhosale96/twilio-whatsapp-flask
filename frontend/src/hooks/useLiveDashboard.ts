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
  ProductDiscoveryItem
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
