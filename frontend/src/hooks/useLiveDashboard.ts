import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SummaryData,
  InventoryItem,
  TransactionItem,
  AlertsData,
  ReportsData,
  VendorSettings,
  ChatMessage
} from '../types';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export function useLiveDashboard() {
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/summary');
      if (res.ok) setSummary(await res.json());
    } catch {}
  }, []);

  const fetchInventory = useCallback(async (search?: string, lowOnly?: boolean) => {
    try {
      let url = '/api/inventory';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (lowOnly) params.append('low_only', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) setInventory(await res.json());
    } catch {}
  }, []);

  const fetchTransactions = useCallback(async (type?: string, search?: string) => {
    try {
      let url = '/api/transactions?limit=100';
      if (type && type !== 'all') url += `&type=${type}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.items || []);
      }
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) setAlerts(await res.json());
    } catch {}
  }, []);

  const fetchReports = useCallback(async (range: string = 'today') => {
    try {
      const res = await fetch(`/api/reports?range=${range}`);
      if (res.ok) setReports(await res.json());
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch {}
  }, []);

  const fetchChatPreview = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-preview');
      if (res.ok) setChatPreview(await res.json());
    } catch {}
  }, []);

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

  // Patch an inventory item
  const patchItem = async (id: number, patch: { threshold?: number; price?: number; reordered?: boolean }) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        await Promise.all([fetchInventory(), fetchAlerts(), fetchSummary()]);
        return true;
      }
    } catch {}
    return false;
  };

  // Update Settings
  const updateVendorSettings = async (data: { name?: string; default_threshold?: number; language?: string }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await fetchSettings();
        return true;
      }
    } catch {}
    return false;
  };

  // Send a simulated WhatsApp message
  const sendSimulationMessage = async (text: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('From', settings?.phone_raw || 'whatsapp:+919876543210');
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

      const es = new EventSource('/api/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus('connected');
        setError(null);
      };

      es.addEventListener('update', () => {
        fetchSummary();
        fetchInventory();
        fetchTransactions();
        fetchAlerts();
        fetchReports(reportRange);
        fetchChatPreview();
      });

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
  }, [refreshAll, fetchSummary, fetchInventory, fetchTransactions, fetchAlerts, fetchReports, reportRange, fetchChatPreview]);

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
    refreshAll,
    patchItem,
    updateVendorSettings,
    sendSimulationMessage,
    fetchInventory,
    fetchTransactions
  };
}

