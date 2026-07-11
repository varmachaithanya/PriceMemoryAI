export type UserRole = 'user' | 'admin';
export type UnitType = 'kg' | 'gram' | 'liter' | 'ml' | 'piece' | 'packet';
export type ReceiptStatus = 'pending' | 'processing' | 'done' | 'failed';
export type AlertType = 'price_spike' | 'store_expensive' | 'inflation';
export type ResolvedBy = 'fuzzy_match' | 'ai';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  store_name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  canonical_name: string;
  category: string | null;
  brand: string | null;
  unit_type: UnitType;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  unit: UnitType;
  total_price: number;
  unit_price: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  // Joined fields
  store?: Store;
  product?: Product;
}

export interface Receipt {
  id: string;
  user_id: string;
  image_url: string;
  receipt_date: string | null;
  processing_status: ReceiptStatus;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  product_id: string | null;
  message: string;
  alert_type: AlertType;
  created_at: string;
  read: boolean;
  product?: Product;
}

export interface ItemAlias {
  id: string;
  raw_text: string;
  normalized_name: string;
  language: string | null;
  resolved_by: ResolvedBy;
  created_at: string;
}

export interface DashboardStats {
  total_products: number;
  total_stores: number;
  purchases_this_month: number;
  avg_monthly_spend: number;
  inflation_percentage: number;
}

export interface ProductPriceStats {
  lowest_price: number;
  highest_price: number;
  average_price: number;
  last_price: number;
}

export interface StoreStats {
  total_purchases: number;
  total_spent: number;
  avg_spend: number;
  unique_products: number;
}

export interface PriceTrend {
  date_label: string;
  avg_price: number;
  purchase_count: number;
}

export interface SpendingTrend {
  month_label: string;
  total_spend: number;
  purchase_count: number;
}

export interface InflationData {
  product_name: string;
  old_avg_price: number;
  new_avg_price: number;
  inflation_pct: number;
}

export interface AdminStats {
  total_users: number;
  total_products: number;
  total_stores: number;
  total_purchases: number;
  active_users: number;
}

export interface NormalizedProduct {
  canonical_name: string;
  confidence: 'high' | 'low';
  resolved_by: 'fuzzy_match' | 'ai';
}

export interface NormalizedQuantity {
  quantity: number;
  unit: string;
  confidence: 'high' | 'low';
}
