-- Idempotent migration: brings a DB up to date with the Account Settings,
-- Legal, and Support features (mobile + web dashboard).
-- Safe to run multiple times, and on both local Postgres and Neon production.

-- ─── users: account-settings columns (may already exist on production) ──────
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS residential_address JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_address JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_opt_in BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(20) NOT NULL DEFAULT 'cod';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "promo_offers":        {"email": false, "push": false, "sms": true},
    "farming_tips":        {"email": false, "push": false, "sms": true},
    "news_updates":        {"email": false, "push": false, "sms": true},
    "feedback_requests":   {"email": false, "push": false, "sms": true},
    "service_alerts":      {"email": false, "push": false, "sms": false},
    "account_activity":    {"email": true,  "push": true,  "sms": false},
    "order_policies":      {"email": true,  "push": true,  "sms": false},
    "schedule_reminders":  {"email": true,  "push": true,  "sms": false},
    "support_messages":    {"email": true,  "push": true,  "sms": false}
  }'::jsonb;

-- ─── organizations: support contact columns ──────────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_email VARCHAR(150) NOT NULL DEFAULT 'support@mrunalagro.in';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_phone VARCHAR(30);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100) NOT NULL DEFAULT 'Mon–Sat, 9am–6pm';

-- ─── data_export_requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_export_requests (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id, requested_at DESC);

-- ─── user_saved_coupons ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_saved_coupons (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, code)
);
CREATE INDEX IF NOT EXISTS idx_user_saved_coupons_user ON user_saved_coupons(user_id);

-- ─── legal_documents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_documents (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(50) UNIQUE NOT NULL,
  title      VARCHAR(150) NOT NULL,
  sections   JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── faq_topics ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq_topics (
  id         SERIAL PRIMARY KEY,
  question   VARCHAR(255) NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seed: legal documents (placeholder copy — have a lawyer review) ────────
INSERT INTO legal_documents (slug, title, sort_order, sections) VALUES
('terms-of-service', 'Terms of Service', 1, '[
  {"heading": "1. Acceptance of terms", "body": "By creating an account or using the Mrunal Agro app, you agree to these Terms of Service. If you don''t agree, please don''t use the app."},
  {"heading": "2. What Mrunal Agro provides", "body": "Mrunal Agro lets you monitor and control irrigation pumps and devices on your farms, view runtime and electricity-usage history, and buy farm supplies through our marketplace. Some features depend on third-party hardware (ESP32 controllers, sensors) that you install and maintain at your own property."},
  {"heading": "3. Your account", "body": "You''re responsible for keeping your login credentials secure and for all activity under your account. Tell us immediately if you suspect unauthorised access."},
  {"heading": "4. Orders and payments", "body": "Prices shown in the Market are in Indian Rupees and include applicable taxes unless stated otherwise. Orders are confirmed once payment is verified. Cash on Delivery orders may incur a handling fee, shown at checkout. We aim to deliver as estimated but delivery dates are not guaranteed."},
  {"heading": "5. Device control and liability", "body": "You control real irrigation hardware through this app. We do our best to keep device status and schedules accurate, but network or hardware issues can delay commands or readings. Don''t rely solely on the app for time-critical safety decisions (e.g. flooding, electrical faults) — always have a manual fallback at the pump site."},
  {"heading": "6. Cancellations and refunds", "body": "Orders can be cancelled before they''re shipped from the Orders screen. Once an order is shipped, contact support to discuss returns. Refunds, where applicable, are issued to the original payment method."},
  {"heading": "7. Account suspension", "body": "We may suspend or terminate accounts that violate these terms, attempt to interfere with other users'' devices, or misuse the marketplace."},
  {"heading": "8. Changes to these terms", "body": "We may update these terms as the app evolves. We''ll let you know about material changes in the app before they take effect."},
  {"heading": "9. Contact", "body": "Questions about these terms? Reach us at support@mrunalagro.in."}
]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO legal_documents (slug, title, sort_order, sections) VALUES
('privacy-policy', 'Privacy Policy', 2, '[
  {"heading": "1. What we collect", "body": "Account details you give us (name, phone, email), farm and device data you add (locations, pump specs, schedules), order and payment history, and basic usage analytics if you''ve left that turned on in Privacy settings."},
  {"heading": "2. How we use it", "body": "To operate your farms and devices, process orders, send service notifications (e.g. pump offline, schedule ran), and improve the app. We do not sell your personal data."},
  {"heading": "3. Device and location data", "body": "Farm GPS coordinates and device telemetry (on/off events, runtime) are stored to power the dashboard, history, and analytics features. This data stays tied to your account and the organisation you belong to."},
  {"heading": "4. Sharing with third parties", "body": "We share order details with payment processors and logistics partners only as needed to fulfil your order. We don''t share your farm or device data with marketing third parties."},
  {"heading": "5. Data retention", "body": "We keep your data while your account is active. If you request account deletion, we schedule permanent removal of your farms, devices, and order history after a grace period, during which you can cancel the deletion."},
  {"heading": "6. Your rights", "body": "You can request a copy of your personal data or ask us to delete your account at any time from Privacy settings. We''ll respond to data export requests by email."},
  {"heading": "7. Security", "body": "We use encrypted connections (HTTPS) between the app, our servers, and your devices, and store passwords using one-way hashing — we never store your raw password."},
  {"heading": "8. Contact", "body": "Privacy questions? Reach us at support@mrunalagro.in."}
]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO legal_documents (slug, title, sort_order, sections) VALUES
('community-guidelines', 'Community Guidelines', 3, '[
  {"heading": "Be honest in reviews", "body": "Only review products you''ve actually purchased and received. Don''t post fake reviews or pay for positive ones."},
  {"heading": "Respect other sellers and support staff", "body": "Keep communication with support and dealers respectful. Abusive behaviour can result in account suspension."},
  {"heading": "Don''t misuse shared devices", "body": "If your account has access to a shared farm or organisation, only control devices you''re authorised to operate."},
  {"heading": "Report problems, don''t self-resolve disputes", "body": "If an order or device issue needs resolving, contact support rather than leaving retaliatory reviews or repeatedly toggling another user''s devices."}
]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: FAQ topics ─────────────────────────────────────────────────────────
INSERT INTO faq_topics (question, answer, sort_order) VALUES
('Where can I track my order?', 'Open the Orders tab from the bottom bar to see every order''s status — placed, confirmed, shipped, or delivered. Tap an order for full details and a live status timeline.', 1),
('How do I cancel an order?', 'You can cancel an order before it ships from the order''s detail screen. Once it''s shipped, please contact us by email so we can help with a return.', 2),
('My pump shows offline — what do I do?', 'Check that the device has power and a working internet/WiFi connection at the farm. The Farms & Devices screen shows the last time each device reported in. If it''s been offline for more than a few minutes, check the ESP32 controller''s power and signal at the pump site.', 3),
('How is electricity cost calculated?', 'We estimate electricity usage from your pump''s motor power rating and how long it ran, using the per-kWh rate set on the Settings page. Add or update pump specs from Farms & Devices to get accurate readings.', 4),
('What payment methods are accepted?', 'Cash on Delivery is available on all orders (a small handling fee applies). Card and UPI options appear at checkout when available for your order.', 5),
('How do I delete my account?', 'Go to Profile → Account settings → Privacy → Delete my account. We''ll schedule deletion with a grace period during which you can still cancel it.', 6)
ON CONFLICT DO NOTHING;

-- ─── Seed: support contact defaults on existing organizations ────────────────
UPDATE organizations SET support_phone = '+91 98765 43210' WHERE support_phone IS NULL;
