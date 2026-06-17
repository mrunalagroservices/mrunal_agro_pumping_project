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
