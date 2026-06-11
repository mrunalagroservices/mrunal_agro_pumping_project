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
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  role            VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner, operator, viewer
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org ON users(organization_id);

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
