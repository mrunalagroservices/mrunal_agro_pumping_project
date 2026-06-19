-- Seed test orders for the logged-in test account, for UI testing.
-- Run this in Neon Console -> SQL Editor.

-- Safety net in case these tables weren't created yet.
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'placed',
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
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
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
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

DO $$
DECLARE
  uid INTEGER;
  oid INTEGER;
  addr JSONB := '{
    "name": "Nishikesh Kardak",
    "phone": "9876554793",
    "line1": "Plot 14, Shivar Industrial Estate",
    "line2": "Near MIDC Road",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  }'::jsonb;
BEGIN
  SELECT id INTO uid FROM users WHERE email = 'nkardak9@gmail.com';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found with that email — update the email in this script';
  END IF;

  -- Order 1: placed, today, COD
  INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, created_at, updated_at)
  VALUES (uid, 'placed', 'cod', addr, 4200, 0, 0, 4200, NOW(), NOW())
  RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_name, category, unit, price, qty) VALUES
    (oid, '1.5 HP Submersible Pump Motor', 'Motors', 'piece', 3800, 1),
    (oid, 'PVC Pipe 2 inch (10 ft)', 'Pipes', 'piece', 400, 1);

  -- Order 2: confirmed, yesterday, UPI
  INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, created_at, updated_at)
  VALUES (uid, 'confirmed', 'upi', addr, 2150, 100, 0, 2250, NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours')
  RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_name, category, unit, price, qty) VALUES
    (oid, 'Drip Irrigation Kit (50m)', 'Irrigation', 'kit', 2150, 1);

  -- Order 3: shipped, 3 days ago, card, with a coupon discount
  INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, coupon_code, created_at, updated_at)
  VALUES (uid, 'shipped', 'card', addr, 1800, 100, 180, 1720, 'SAVE10', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day')
  RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_name, category, unit, price, qty) VALUES
    (oid, 'Solenoid Valve 1 inch', 'Valves', 'piece', 950, 1),
    (oid, 'Pressure Gauge 0-10 bar', 'Accessories', 'piece', 850, 1);

  -- Order 4: delivered, 7 days ago, COD
  INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, created_at, updated_at)
  VALUES (uid, 'delivered', 'cod', addr, 650, 0, 0, 650, NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_name, category, unit, price, qty) VALUES
    (oid, 'Water Level Sensor', 'Sensors', 'piece', 650, 1);

  -- Order 5: cancelled, 10 days ago, UPI
  INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, created_at, updated_at)
  VALUES (uid, 'cancelled', 'upi', addr, 1200, 100, 0, 1300, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
  RETURNING id INTO oid;
  INSERT INTO order_items (order_id, product_name, category, unit, price, qty) VALUES
    (oid, 'Sprinkler Head Set (10 pcs)', 'Irrigation', 'set', 1200, 1);

  RAISE NOTICE 'Seeded 5 test orders for user_id %', uid;
END $$;
