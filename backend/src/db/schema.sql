-- Mrunal Agro Pumping Control — PostgreSQL schema
-- Modeled on the existing Mrunal Agro `devices` / `actuators` / `automation_rules`
-- tables so a future merge is a data migration, not a rewrite.

-- ─── Tenancy ──────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id                       SERIAL PRIMARY KEY,
  name                     VARCHAR(150) NOT NULL,
  electricity_rate_per_kwh NUMERIC NOT NULL DEFAULT 8, -- ₹ per kWh, used for analytics cost estimates
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  organization_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 VARCHAR(150) NOT NULL,
  email                VARCHAR(150) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  phone                VARCHAR(20),
  role                 VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner, operator, viewer
  is_admin             BOOLEAN NOT NULL DEFAULT false,       -- platform-wide admin flag
  preferred_first_name VARCHAR(100),
  residential_address  JSONB, -- { line1, line2, city, state, pincode }
  postal_address       JSONB, -- { line1, line2, city, state, pincode }
  emergency_contact    JSONB, -- { name, phone, relationship }
  analytics_opt_in     BOOLEAN NOT NULL DEFAULT true,
  deletion_requested_at TIMESTAMPTZ,
  notification_preferences JSONB NOT NULL DEFAULT '{
    "promo_offers":        {"email": false, "push": false, "sms": true},
    "farming_tips":        {"email": false, "push": false, "sms": true},
    "news_updates":        {"email": false, "push": false, "sms": true},
    "feedback_requests":   {"email": false, "push": false, "sms": true},
    "service_alerts":      {"email": false, "push": false, "sms": false},
    "account_activity":    {"email": true,  "push": true,  "sms": false},
    "order_policies":      {"email": true,  "push": true,  "sms": false},
    "schedule_reminders":  {"email": true,  "push": true,  "sms": false},
    "support_messages":    {"email": true,  "push": true,  "sms": false}
  }'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org ON users(organization_id);

-- ─── Data export requests (Privacy → "Request my personal data") ─────────────
CREATE TABLE data_export_requests (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_data_export_requests_user ON data_export_requests(user_id, requested_at DESC);

-- ─── Farms ────────────────────────────────────────────────────────────────
CREATE TABLE farms (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  location        VARCHAR(255),
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_farms_org ON farms(organization_id);

-- ─── Devices (ESP32 gateways) ───────────────────────────────────────────────
CREATE TABLE devices (
  id               SERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id          INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  name             VARCHAR(150) NOT NULL,
  api_key          VARCHAR(100) UNIQUE NOT NULL,
  device_type      VARCHAR(50) NOT NULL DEFAULT 'esp32_gateway',
  firmware_version VARCHAR(30),
  relay_count      INTEGER NOT NULL DEFAULT 4,
  status           VARCHAR(20) NOT NULL DEFAULT 'offline', -- online, offline
  ip_address       VARCHAR(50),
  last_seen_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_devices_org ON devices(organization_id);
CREATE INDEX idx_devices_farm ON devices(farm_id);
CREATE INDEX idx_devices_api_key ON devices(api_key);

-- ─── Sensors ────────────────────────────────────────────────────────────────
CREATE TABLE sensors (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  farm_id         INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  name            VARCHAR(150) NOT NULL,
  sensor_type     VARCHAR(50) NOT NULL, -- water_level, voltage, current, flow_rate, pressure, temperature, soil_moisture
  channel         VARCHAR(50) NOT NULL, -- key matched in the MQTT sensors payload
  unit            VARCHAR(20),
  current_value   NUMERIC,
  min_threshold   NUMERIC,
  max_threshold   NUMERIC,
  last_reading_at TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, disabled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, channel)
);
CREATE INDEX idx_sensors_org ON sensors(organization_id);
CREATE INDEX idx_sensors_device ON sensors(device_id);

-- Time-series sensor history (lightweight; can move to Mongo at merge time)
CREATE TABLE sensor_readings (
  id              BIGSERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sensor_id       INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value           NUMERIC NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, recorded_at DESC);

-- ─── Actuators (motors / pumps / valves) ────────────────────────────────────
CREATE TABLE actuators (
  id                  SERIAL PRIMARY KEY,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id           INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  farm_id             INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  name                VARCHAR(150) NOT NULL,
  actuator_type       VARCHAR(50) NOT NULL DEFAULT 'motor', -- motor, pump, valve
  relay_channel       INTEGER NOT NULL, -- relay/GPIO index on the device
  current_state       VARCHAR(10) NOT NULL DEFAULT 'off', -- on, off
  auto_mode           BOOLEAN NOT NULL DEFAULT false,
  max_runtime_minutes INTEGER, -- safety auto-off, NULL = no limit
  last_turned_on_at   TIMESTAMPTZ,
  last_turned_off_at  TIMESTAMPTZ,
  status              VARCHAR(20) NOT NULL DEFAULT 'active', -- active, disabled
  pipe_diameter_mm    NUMERIC, -- pump specs, used for water-usage analytics
  flow_velocity_ms    NUMERIC, -- water velocity through the pipe (m/s)
  flow_rate_lpm       NUMERIC, -- optional rated flow rate from pump nameplate (L/min), overrides pipe-based estimate
  power_rating_watts  NUMERIC, -- motor power rating, used for electricity-usage analytics
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, relay_channel)
);
CREATE INDEX idx_actuators_org ON actuators(organization_id);
CREATE INDEX idx_actuators_device ON actuators(device_id);

-- ─── Automation rules (sensor → actuator) ───────────────────────────────────
CREATE TABLE automation_rules (
  id                      SERIAL PRIMARY KEY,
  organization_id         INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id                 INTEGER REFERENCES farms(id) ON DELETE CASCADE,
  name                    VARCHAR(150) NOT NULL,
  trigger_sensor_id       INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  trigger_condition       VARCHAR(2) NOT NULL, -- '<', '>', '<=', '>=', '=='
  trigger_value           NUMERIC NOT NULL,
  action_actuator_id      INTEGER NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
  action_state            VARCHAR(10) NOT NULL, -- on, off
  action_duration_minutes INTEGER NOT NULL DEFAULT 0, -- 0 = indefinite
  is_active               BOOLEAN NOT NULL DEFAULT true,
  trigger_count           INTEGER NOT NULL DEFAULT 0,
  last_triggered_at       TIMESTAMPTZ,
  created_by              INTEGER REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_automation_rules_org ON automation_rules(organization_id);
CREATE INDEX idx_automation_rules_sensor ON automation_rules(trigger_sensor_id);

-- ─── Schedules (time-based actuator control) ────────────────────────────────
CREATE TABLE schedules (
  id               SERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actuator_id      INTEGER NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
  name             VARCHAR(150) NOT NULL,
  days_of_week     SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sun .. 6=Sat
  start_time       TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  last_run_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedules_org ON schedules(organization_id);
CREATE INDEX idx_schedules_actuator ON schedules(actuator_id);

-- ─── Actuator activity log ───────────────────────────────────────────────────
CREATE TABLE actuator_logs (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actuator_id      INTEGER NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
  action           VARCHAR(10) NOT NULL, -- on, off
  triggered_by     VARCHAR(20) NOT NULL, -- user, automation, schedule, safety_cutoff
  triggered_by_id  INTEGER, -- user_id / rule_id / schedule_id, depending on triggered_by
  duration_minutes INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_actuator_logs_actuator ON actuator_logs(actuator_id, created_at DESC);

-- ─── Alerts ───────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id               SERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id        INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  sensor_id        INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
  actuator_id      INTEGER REFERENCES actuators(id) ON DELETE CASCADE,
  alert_type       VARCHAR(50) NOT NULL, -- threshold, offline, safety_cutoff, error
  severity         VARCHAR(20) NOT NULL DEFAULT 'warning', -- info, warning, critical
  message          TEXT NOT NULL,
  is_resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alerts_org ON alerts(organization_id, is_resolved);

-- ─── Device event log ────────────────────────────────────────────────────────
CREATE TABLE device_logs (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id        INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event_type       VARCHAR(50) NOT NULL, -- online, offline, command_sent, error
  payload          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_device_logs_device ON device_logs(device_id, created_at DESC);

-- ─── Marketplace products ────────────────────────────────────────────────────
CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  category       VARCHAR(100) NOT NULL,
  price          NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  unit           VARCHAR(100),
  image_url      TEXT,
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 100,
  rating         NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- ─── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'placed',
  -- placed | confirmed | shipped | delivered | cancelled
  payment_method   VARCHAR(50) NOT NULL,
  delivery_address JSONB NOT NULL,
  subtotal         NUMERIC(10,2) NOT NULL,
  delivery_charge  NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  coupon_code      VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);

-- ─── Order items (product snapshot at checkout time) ───────────────────────────
CREATE TABLE order_items (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name   VARCHAR(255) NOT NULL,
  product_image  TEXT,
  category       VARCHAR(100),
  unit           VARCHAR(100),
  price          NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  qty            INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ─── Search history ────────────────────────────────────────────────────────────
CREATE TABLE search_history (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  query         TEXT NOT NULL,
  results_count INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_time ON search_history(created_at DESC);

-- ─── Shop settings (admin-controlled) ─────────────────────────────────────────
CREATE TABLE shop_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO shop_settings (key, value) VALUES
  ('price_range',           '{"min": 0, "max": 5000}'),
  ('rating_options',        '[0, 3.5, 4, 4.5]'),
  ('categories',            '["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"]'),
  ('delivery_charge_online','100'),
  ('coupons',               '[{"code":"FARM10","type":"percent","value":10,"min_order":0,"is_active":true},{"code":"SAVE50","type":"flat","value":50,"min_order":500,"is_active":true},{"code":"AGRO20","type":"percent","value":20,"min_order":1000,"is_active":true}]');

-- ─── Irrigation / Zone Management ────────────────────────────────────────────

CREATE TABLE zones (
  id                  SERIAL PRIMARY KEY,
  farm_id             INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  crop_type           VARCHAR(100),
  area_sqm            NUMERIC,
  description         TEXT,
  valve_actuator_id   INTEGER REFERENCES actuators(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_zones_farm ON zones(farm_id);

CREATE TABLE irrigation_plans (
  id                  SERIAL PRIMARY KEY,
  farm_id             INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                VARCHAR(150) NOT NULL,
  motor_actuator_id   INTEGER REFERENCES actuators(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE irrigation_plan_steps (
  id                  SERIAL PRIMARY KEY,
  plan_id             INTEGER NOT NULL REFERENCES irrigation_plans(id) ON DELETE CASCADE,
  step_order          INTEGER NOT NULL,
  zone_id             INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  zone_name           VARCHAR(100),
  duration_minutes    INTEGER NOT NULL DEFAULT 15,
  UNIQUE(plan_id, step_order)
);

CREATE TABLE irrigation_runs (
  id                  SERIAL PRIMARY KEY,
  plan_id             INTEGER REFERENCES irrigation_plans(id) ON DELETE SET NULL,
  plan_name           VARCHAR(150),
  farm_id             INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  organization_id     INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'running',
  current_step        INTEGER NOT NULL DEFAULT 0,
  total_steps         INTEGER NOT NULL DEFAULT 0,
  triggered_by        VARCHAR(50) NOT NULL DEFAULT 'manual',
  is_simulation       BOOLEAN NOT NULL DEFAULT false,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  notes               TEXT
);
CREATE INDEX idx_irrigation_runs_farm ON irrigation_runs(farm_id, started_at DESC);

CREATE TABLE irrigation_run_logs (
  id                  SERIAL PRIMARY KEY,
  run_id              INTEGER NOT NULL REFERENCES irrigation_runs(id) ON DELETE CASCADE,
  step_order          INTEGER NOT NULL,
  zone_id             INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  zone_name           VARCHAR(100),
  duration_minutes    INTEGER NOT NULL,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  status              VARCHAR(50) NOT NULL DEFAULT 'pending'
);

-- ─── User carts (server-side cart snapshot for admin visibility) ──────────────
CREATE TABLE user_carts (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Power events (electricity ON/OFF reported by battery-powered ESP32) ──────
CREATE TABLE power_events (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id        INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event_type       VARCHAR(20) NOT NULL CHECK (event_type IN ('power_on', 'power_off')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_power_events_device ON power_events(device_id, created_at DESC);
