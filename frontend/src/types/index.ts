export type ScreenType = 
  | 'dashboard' 
  | 'inventory' 
  | 'transactions' 
  | 'alerts' 
  | 'reports' 
  | 'onboarding' 
  | 'settings'
  | 'privacy'
  | 'terms';

export interface TopSeller {
  name: string;
  unit: string;
  units_sold: number;
  revenue: number;
  revenue_formatted: string;
}

export interface SummaryData {
  vendor_masked: string;
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  negative_stock_count: number;
  alerts_count: number;
  sales_today_units: number;
  revenue_today: number;
  revenue_today_formatted: string;
  top_sellers: TopSeller[];
  data_version: number;
}

export interface InventoryItem {
  id: number;
  vendor_masked: string;
  name: string;
  unit: string;
  qty: number;
  threshold: number;
  price: number | null;
  price_formatted: string | null;
  reordered: boolean;
  is_low: boolean;
  is_out_of_stock: boolean;
  is_negative: boolean;
  updated_at: string;
}

export interface TransactionItem {
  id: number;
  batch_id: string;
  vendor_masked: string;
  item_name: string;
  unit: string;
  change: number;
  type: 'add' | 'sell';
  price: number | null;
  price_formatted: string | null;
  revenue: number;
  revenue_formatted: string | null;
  raw_text: string;
  created_at: string;
  undone: boolean;
}

export interface AlertItem {
  id: number;
  name: string;
  unit: string;
  qty: number;
  threshold: number;
  price: number | null;
  price_formatted: string | null;
  status: 'negative' | 'out_of_stock' | 'low_stock';
  reordered: boolean;
  reorder_suggested: number;
  updated_at: string;
}

export interface AlertsData {
  count: number;
  items: AlertItem[];
  copyable_reorder_message: string;
}

export interface ReportItem {
  name: string;
  unit: string;
  units_sold: number;
  revenue: number;
}

export interface ReportsData {
  range: string;
  start_date: string;
  total_revenue: number;
  total_revenue_formatted: string;
  total_units_sold: number;
  item_count: number;
  items: ReportItem[];
  top_items: ReportItem[];
  slowest_items: ReportItem[];
}

export interface VendorSettings {
  phone_masked: string;
  phone_raw: string;
  name: string | null;
  default_threshold: number;
  language: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  sender_masked: string;
  incoming_text: string;
  reply_text: string;
  is_voice: boolean;
  transcript: string | null;
  parsed_items: Array<{
    action: string;
    item: string;
    qty: number;
    unit: string;
    price?: number | null;
  }>;
  timestamp: string;
}
