export type ScreenType = 
  | 'dashboard'
  | 'tour'
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
  today_updates_count?: number;
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
  cost_price?: number | null;
  tax_rate?: number;
  barcode?: string | null;
  sku?: string | null;
  category?: string;
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

export interface DailyMovementItem {
  date: string;
  day_label: string;
  formatted_date?: string;
  display_title?: string;
  stock_in: number;
  stock_out: number;
  total_moved: number;
  revenue?: number;
  revenue_formatted?: string;
}

export interface ReportsData {
  range: string;
  start_date: string;
  end_date?: string;
  date_range_label?: string;
  total_revenue: number;
  total_revenue_formatted: string;
  total_units_sold: number;
  total_stock_in_units?: number;
  total_stock_out_units?: number;
  item_count: number;
  critical_count?: number;
  items: ReportItem[];
  top_items: ReportItem[];
  slowest_items: ReportItem[];
  daily_movement?: DailyMovementItem[];
}

export interface VendorSettings {
  phone_masked: string;
  phone_raw: string;
  name: string | null;
  shop_name?: string | null;
  category?: string | null;
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

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AuthUser {
  phone: string;
  name: string;
  role?: UserRole;
  shop_name?: string;
  category?: string;
  email?: string;
  city?: string;
  address?: string;
  language?: string;
}

export interface ProductStoreInfo {
  name: string;
  owner: string;
  category: string;
  phone_masked: string;
  location: string;
}

export interface ProductDiscoveryItem {
  id: number;
  name: string;
  unit: string;
  qty: number;
  threshold: number;
  price: number | null;
  price_formatted: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_in_stock: boolean;
  category: string;
  image_url: string;
  store: ProductStoreInfo;
  updated_at?: string;
}

export interface OrderItemData {
  id?: number;
  item_id?: number | null;
  product_name: string;
  unit: string;
  qty: number;
  unit_price?: number | null;
  line_total: number;
  price_source?: string;
  reference_note?: string | null;
  reference_confidence?: number | null;
  in_stock?: boolean;
  current_inventory_qty?: number | null;
  is_confirmed_by_vendor?: boolean;
}

export interface BillData {
  id: number;
  bill_number: string;
  bill_type: 'quotation' | 'invoice';
  version: number;
  issue_date?: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  delivery_charge: number;
  final_total: number;
  payment_status: 'unpaid' | 'paid' | 'cancelled';
  payment_method?: string;
  vendor_gstin?: string;
  has_pdf: boolean;
}

export interface OrderData {
  id: string;
  customer_phone?: string;
  customer_name: string;
  customer_address?: string;
  vendor: {
    phone: string;
    name: string;
    category: string;
  };
  request_type: 'cart' | 'custom_text' | 'image_list';
  raw_text?: string;
  has_image?: boolean;
  notes?: string;
  status:
    | 'New'
    | 'Reviewing'
    | 'Awaiting Price'
    | 'Quote Sent'
    | 'Awaiting Customer Approval'
    | 'Confirmed'
    | 'Preparing'
    | 'Completed'
    | 'Cancelled';
  price_status: 'pending' | 'quoted' | 'confirmed' | 'paid';
  subtotal: number;
  discount: number;
  tax_amount: number;
  delivery_charge: number;
  total_amount: number;
  stock_deducted: boolean;
  delivery_notification_status?: string;
  created_at?: string;
  updated_at?: string;
  items: OrderItemData[];
  bills: BillData[];
}

export interface CustomerRecord {
  name: string;
  phone: string;
  address?: string;
  city?: string;
  email?: string;
  is_registered?: boolean;
}

export interface VendorBillItem {
  item_id?: number;
  product_name: string;
  qty: number;
  quantity?: number;
  unit: string;
  unit_price: number;
  barcode?: string | null;
  sku?: string | null;
  discount?: number;
  tax_rate?: number;
  line_total: number;
  total_amount?: number;
  current_stock?: number;
}

export interface VendorBillData {
  id: number;
  bill_number: string;
  order_id?: string;
  vendor_phone: string;
  vendor_name?: string;
  vendor_address?: string;
  customer_phone?: string;
  customer_name?: string;
  customer_address?: string;
  bill_type: 'invoice' | 'quotation';
  status: 'draft' | 'finalized' | 'sent' | 'paid' | 'partially_paid' | 'cancelled';
  version: number;
  issue_date?: string;
  subtotal: number;
  discount: number;
  discount_amount?: number;
  tax_rate: number;
  tax_amount?: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  delivery_charge: number;
  final_total: number;
  grand_total?: number;
  payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
  payment_method?: string;
  amount_paid: number;
  balance_due: number;
  delivery_channel?: string;
  delivery_status: 'pending' | 'delivered' | 'failed' | 'sent' | 'skipped';
  delivery_error?: string;
  stock_deducted: boolean;
  access_token?: string;
  vendor_gstin?: string;
  notes?: string;
  has_pdf: boolean;
  items: VendorBillItem[];
  created_at?: string;
  updated_at?: string;
}

export interface BarcodeDecodeResult {
  text: string;
  format: string;
  is_valid?: boolean;
}
