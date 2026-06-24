export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Organization {
  id: number;
  name: string;
  electricity_rate_per_kwh?: number;
  support_email?: string;
  support_phone?: string | null;
  support_hours?: string;
  created_at?: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface NotificationChannelPrefs {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export type NotificationCategory =
  | "promo_offers" | "farming_tips" | "news_updates" | "feedback_requests" | "service_alerts"
  | "account_activity" | "order_policies" | "schedule_reminders" | "support_messages";

export type NotificationPreferences = Record<NotificationCategory, NotificationChannelPrefs>;

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_admin?: boolean;
  preferred_first_name?: string | null;
  residential_address?: Address | null;
  postal_address?: Address | null;
  emergency_contact?: EmergencyContact | null;
  analytics_opt_in?: boolean;
  deletion_requested_at?: string | null;
  preferred_payment_method?: "cod" | "card" | "upi";
  notification_preferences?: NotificationPreferences;
}

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocumentSummary {
  slug: string;
  title: string;
  updated_at: string;
}

export interface LegalDocument extends LegalDocumentSummary {
  sections: LegalSection[];
}

export interface FaqTopic {
  id: number;
  question: string;
  answer: string;
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
  actuators: { id: number; name: string; actuator_type: string; current_state: string; device_id: number; farm_id?: number }[];
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

export interface ProductReview {
  id: number;
  rating: number;
  comment?: string | null;
  user_name: string;
  created_at: string;
}

export type DiagramElementType = 'well' | 'motor' | 'valve' | 'electricity_pole' | 'pipe_junction' | 'pipe_end';
export type DiagramConnectionType = 'pipe' | 'wire';
export type DiagramTool = 'select' | 'boundary' | 'zone' | DiagramElementType | DiagramConnectionType;

export interface DiagramElement {
  id: string;
  type: DiagramElementType;
  lat: number;
  lng: number;
  label?: string;
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  type: DiagramConnectionType;
}

export interface BoundaryPoint {
  lat: number;
  lng: number;
}

export interface FarmDiagram {
  elements: DiagramElement[];
  connections: DiagramConnection[];
  boundary?: BoundaryPoint[];
}

export interface Farm {
  id: number;
  organization_id: number;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  device_count?: string | number;
  devices?: { id: number; name: string; status: string; last_seen_at?: string | null }[];
  diagram?: FarmDiagram | null;
  created_at: string;
  updated_at?: string;
}

// ─── Irrigation / Zone types ──────────────────────────────────────────────────
export interface Zone {
  id: number;
  farm_id: number;
  organization_id: number;
  name: string;
  crop_type?: string | null;
  area_sqm?: number | null;
  description?: string | null;
  valve_actuator_id?: number | null;
  valve_name?: string | null;
  valve_state?: "on" | "off" | string | null;
  color?: string | null;
  boundary?: BoundaryPoint[] | null;
  created_at: string;
}

export interface IrrigationPlanStep {
  id: number;
  plan_id: number;
  step_order: number;
  zone_id?: number | null;
  zone_name?: string | null;
  duration_minutes: number;
  valve_actuator_id?: number | null;
  valve_name?: string | null;
  valve_state?: string | null;
}

export interface IrrigationPlan {
  id: number;
  farm_id: number;
  name: string;
  motor_actuator_id?: number | null;
  motor_name?: string | null;
  motor_state?: string | null;
  is_active: boolean;
  created_at: string;
  steps: IrrigationPlanStep[];
}

export interface IrrigationRunLog {
  step_order: number;
  zone_name?: string | null;
  duration_minutes: number;
  status: "pending" | "running" | "completed" | "aborted" | string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface IrrigationRun {
  id: number;
  plan_id?: number | null;
  plan_name?: string | null;
  farm_id?: number | null;
  status: "running" | "completed" | "aborted" | string;
  current_step: number;
  total_steps: number;
  triggered_by: string;
  is_simulation: boolean;
  started_at: string;
  completed_at?: string | null;
  steps?: IrrigationRunLog[];
}

export interface Device {
  id: number;
  organization_id: number;
  farm_id: number;
  farm_name?: string;
  name: string;
  api_key: string;
  device_type: string;
  firmware_version?: string | null;
  relay_count: number;
  status: "online" | "offline" | string;
  ip_address?: string | null;
  last_seen_at?: string | null;
  sensor_count?: string | number;
  actuator_count?: string | number;
  created_at: string;
}

export interface Sensor {
  id: number;
  organization_id: number;
  device_id: number;
  farm_id: number;
  name: string;
  sensor_type: string;
  channel: string;
  unit?: string | null;
  current_value?: number | null;
  min_threshold?: number | null;
  max_threshold?: number | null;
  last_reading_at?: string | null;
  status: string;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  value: number;
  recorded_at: string;
}

export interface Actuator {
  id: number;
  organization_id: number;
  device_id: number;
  device_name?: string;
  farm_id: number;
  farm_name?: string;
  name: string;
  actuator_type: string;
  relay_channel: number;
  current_state: "on" | "off" | string;
  auto_mode: boolean;
  max_runtime_minutes?: number | null;
  last_turned_on_at?: string | null;
  last_turned_off_at?: string | null;
  status: string;
  pipe_diameter_mm?: number | null;
  flow_velocity_ms?: number | null;
  flow_rate_lpm?: number | null;
  power_rating_watts?: number | null;
}

export interface ActuatorLog {
  id: number;
  actuator_id: number;
  action: string;
  triggered_by: string;
  triggered_by_id?: number | null;
  duration_minutes?: number | null;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  organization_id: number;
  farm_id: number;
  name: string;
  trigger_sensor_id: number;
  trigger_sensor_name?: string;
  trigger_condition: "<" | ">" | "<=" | ">=" | "==";
  trigger_value: number;
  action_actuator_id: number;
  action_actuator_name?: string;
  action_state: "on" | "off";
  action_duration_minutes: number;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at?: string | null;
}

export interface Schedule {
  id: number;
  organization_id: number;
  actuator_id: number;
  actuator_name?: string;
  name: string;
  days_of_week: number[];
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
  last_run_at?: string | null;
}

export interface Alert {
  id: number;
  organization_id: number;
  device_id?: number | null;
  device_name?: string;
  sensor_id?: number | null;
  actuator_id?: number | null;
  alert_type: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  created_at: string;
}

export interface DeviceLog {
  id: number;
  device_id: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DeviceDetail extends Device {
  sensors: Sensor[];
  actuators: Actuator[];
  logs: DeviceLog[];
}

export interface AnalyticsTotals {
  runtime_minutes: number;
  water_liters: number;
  electricity_kwh: number;
  cost: number;
  currently_running: number;
}

export interface AnalyticsActuatorBreakdown {
  id: number;
  name: string;
  farm_name?: string | null;
  actuator_type: string;
  current_state: "on" | "off" | string;
  runtime_minutes: number;
  water_liters: number;
  electricity_kwh: number;
  cost: number;
  specs_configured: boolean;
}

export interface AnalyticsOverview {
  range: "24h" | "10d";
  electricity_rate_per_kwh: number;
  totals: AnalyticsTotals;
  actuators: AnalyticsActuatorBreakdown[];
}

export interface AnalyticsSeriesBucket {
  label: string;
  start: string;
  end: string;
  runtime_minutes: number;
  water_liters: number;
  electricity_kwh: number;
  cost: number;
}

export interface AnalyticsSeries {
  range: "24h" | "10d";
  electricity_rate_per_kwh: number;
  buckets: AnalyticsSeriesBucket[];
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

export interface Order {
  id: number;
  user_id?: number | null;
  status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled" | string;
  payment_method: string;
  delivery_address: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
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

export interface AdminOrder extends Order {
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  results_count?: number | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export interface AnalyticsRuntimeSession {
  start: string;
  end: string;
}

export interface AnalyticsDailyActuatorRuntime {
  id: number;
  name: string;
  hours: number;
  sessions: AnalyticsRuntimeSession[];
}

export interface AnalyticsDailyRuntimeDay {
  date: string;
  label: string;
  total_hours: number;
  water_liters: number;
  electricity_kwh: number;
  actuators: AnalyticsDailyActuatorRuntime[];
}

export interface AnalyticsDailyRuntime {
  days: AnalyticsDailyRuntimeDay[];
}
