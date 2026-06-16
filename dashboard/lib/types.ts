export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Organization {
  id: number;
  name: string;
  electricity_rate_per_kwh?: number;
  created_at?: string;
}

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
}

export type DiagramElementType = 'well' | 'motor' | 'valve' | 'electricity_pole' | 'pipe_junction';
export type DiagramConnectionType = 'pipe' | 'wire';
export type DiagramTool = 'select' | DiagramElementType | DiagramConnectionType;

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

export interface FarmDiagram {
  elements: DiagramElement[];
  connections: DiagramConnection[];
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
