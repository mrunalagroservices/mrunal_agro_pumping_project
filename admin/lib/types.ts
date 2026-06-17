export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin?: boolean;
  organization_id: number;
}

export interface AdminStats {
  farmers: number;
  farms: number;
  devices: { total: number; online: number };
  actuators: { total: number; running: number };
}

export interface AdminFarmer {
  id: number;
  org_name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_id: number | null;
  farm_count: number;
  device_count: number;
  online_device_count: number;
  actuator_count: number;
  running_actuator_count: number;
  created_at: string;
}

export interface AdminFarmerDetail {
  organization: { id: number; name: string; owner_name: string; owner_email: string; owner_phone: string };
  farms: { id: number; name: string; location?: string }[];
  devices: { id: number; name: string; device_type: string; status: string; last_seen_at?: string; farm_id?: number }[];
  actuators: { id: number; name: string; actuator_type: string; current_state: string; device_id: number }[];
}

export interface AdminFarm {
  id: number;
  name: string;
  location?: string | null;
  organization_id: number;
  org_name: string;
  device_count: number;
  actuator_count: number;
  created_at: string;
}

export interface AdminDevice {
  id: number;
  name: string;
  device_type: string;
  status: string;
  last_seen_at?: string | null;
  farm_id?: number | null;
  farm_name?: string | null;
  organization_id: number;
  org_name: string;
  actuator_count: number;
  sensor_count: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  org_name: string;
  order_count: number;
  last_order_at?: string | null;
  created_at: string;
}

export interface UserProfile {
  user: AdminUser & { org_id: number };
  orders: Array<{
    id: number;
    status: string;
    payment_method: string;
    delivery_address: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
    subtotal: number;
    delivery_charge: number;
    discount: number;
    total: number;
    coupon_code?: string | null;
    created_at: string;
    items: OrderItem[];
  }>;
  cart: Array<{ product: { id: number; name: string; image_url?: string | null; unit?: string | null; price: number }; qty: number }>;
  top_searches: Array<{ query: string; count: number }>;
  payment_methods: Array<{ payment_method: string; count: number }>;
}

export interface ShopSettings {
  price_range: { min: number; max: number };
  rating_options: number[];
  categories: string[];
  delivery_charge_online: number;
  coupons: Array<{
    code: string;
    type: "percent" | "flat";
    value: number;
    min_order: number;
    is_active: boolean;
  }>;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  product_name: string;
  product_image?: string | null;
  category?: string | null;
  unit?: string | null;
  price: number;
  original_price?: number | null;
  qty: number;
}

export interface AdminOrder {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled" | string;
  payment_method: string;
  delivery_address: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  };
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total: number;
  coupon_code?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  results_count?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  original_price: number;
  unit?: string | null;
  image_url?: string | null;
  is_best_seller: boolean;
  is_active: boolean;
  stock_quantity: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}
