export type ListStatus = "active" | "completed" | "archived";

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  city?: string | null;
  neighborhood?: string | null;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  category_id: string | null;
  package_size?: string | null;
  barcode?: string | null;
  subcategory?: string | null;
  image_url?: string | null;
  is_global?: boolean;
};

export type ShoppingListRow = {
  id: string;
  name: string;
  supermarket_id: string | null;
  owner_id: string;
  status: ListStatus;
  share_code: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ListItemRow = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  checked: boolean;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  last_price?: number | null;
  product?: Product;
  added_by_profile?: Pick<Profile, "id" | "name"> | null;
};

export type MonthlyStats = {
  month_total: number;
  trips_this_month: number;
  avg_per_trip_month: number;
  last_purchase_at: string | null;
};

export type SavingsSuggestion = {
  has_suggestion: boolean;
  best_market_id?: string;
  best_market_name?: string;
  worst_market_name?: string;
  estimated_savings?: number;
};
