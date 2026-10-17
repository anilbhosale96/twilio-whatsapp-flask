import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SummaryData,
  InventoryItem,
  TransactionItem,
  AlertsData,
  ReportsData,
  VendorSettings,
  ChatMessage,
  AuthUser
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
    return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
  }, [authToken]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/summary', { headers: getAuthHeaders() });
      if (res.ok) setSummary(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchInventory = useCallback(async (search?: string, lowOnly?: boolean) => {
    try {
      let url = '/api/inventory';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowOnly) params.append('low_only', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) setInventory(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchTransactions = useCallback(async (type?: string, search?: string) => {
    try {
      let url = '/api/transactions?limit=100';
      if (type && type !== 'all') url += `&type=${type}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.items || []);
      }
    } catch {}
  }, [getAuthHeaders]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { headers: getAuthHeaders() });
      if (res.ok) setAlerts(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchReports = useCallback(async (range: string = 'today') => {
    try {
      const res = await fetch(`/api/reports?range=${range}`, { headers: getAuthHeaders() });
      if (res.ok) setReports(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { headers: getAuthHeaders() });
      if (res.ok) setSettings(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const fetchChatPreview = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-preview', { headers: getAuthHeaders() });
      if (res.ok) setChatPreview(await res.json());
    } catch {}
  }, [getAuthHeaders]);

  const refreshAll = useCallback(async () => {
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
  }, [fetchSummary, fetchInventory, fetchTransactions, fetchAlerts, fetchReports, reportRange, fetchSettings, fetchChatPreview]);

  // Login handler
  const login = async (phone: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Login failed' };
      }
      localStorage.setItem('smartstock_token', data.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(data.vendor));
      setAuthToken(data.access_token);
      setCurrentUser(data.vendor);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Unable to connect to server.' };
    }
  };

  // Register handler
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
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Registration failed' };
      }
      localStorage.setItem('smartstock_token', data.access_token);
      localStorage.setItem('smartstock_user', JSON.stringify(data.vendor));
      setAuthToken(data.access_token);
      setCurrentUser(data.vendor);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Unable to connect to server.' };
    }
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
      formData.append('From', currentUser?.phone || settings?.phone_raw || 'whatsapp:+919876543210');
      formData.append('Body', text);
      formData.append('NumMedia', '0');

      const res = await fetch('/webhook', {
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
    logout,
    refreshAll,
    addItem,
    deleteItem,
    patchItem,
    updateVendorSettings,
    sendSimulationMessage,
    fetchInventory,
    fetchTransactions
  };
}
