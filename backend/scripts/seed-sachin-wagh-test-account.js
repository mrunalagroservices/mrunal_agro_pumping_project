// One-off seed: creates a fully-populated test account for Sachin Wagh,
// sharing the same farm/organization as nkardak9@gmail.com (org id 1, farm
// "Sachin Wagh Lamkani"), plus a farm diagram, sample orders, and sample
// alerts/irrigation-run notifications so every screen has real data to test.
// Run with: DATABASE_URL=... node scripts/seed-sachin-wagh-test-account.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const ORG_ID = 1;
const FARM_ID = 1;
const DEVICE_ID = 1; // "Main Controller"
const ACTUATOR_ID = 1; // "Main Motor"

const USER = {
  name: 'Sachin Wagh',
  email: '8806738675@mrunalagro.in', // app login is email-based; phone number is also stored below
  password: 'Sachin@96',
  phone: '8806738675',
};

const FARM_LAT = 21.081180275068235;
const FARM_LNG = 74.4606488570538;

const diagram = {
  elements: [
    { id: 'well-1', type: 'well', lat: FARM_LAT, lng: FARM_LNG, label: 'Borewell' },
    { id: 'motor-1', type: 'motor', lat: FARM_LAT + 0.0003, lng: FARM_LNG + 0.0002, label: 'Main Motor' },
    { id: 'pole-1', type: 'electricity_pole', lat: FARM_LAT + 0.0004, lng: FARM_LNG - 0.0002, label: 'Power Pole' },
    { id: 'junction-1', type: 'pipe_junction', lat: FARM_LAT + 0.0008, lng: FARM_LNG + 0.0005, label: 'Junction A' },
    { id: 'valve-1', type: 'valve', lat: FARM_LAT + 0.0012, lng: FARM_LNG + 0.0003, label: 'Zone 1 Valve' },
    { id: 'valve-2', type: 'valve', lat: FARM_LAT + 0.0012, lng: FARM_LNG + 0.0008, label: 'Zone 2 Valve' },
  ],
  connections: [
    { id: 'c1', from: 'well-1', to: 'motor-1', type: 'pipe' },
    { id: 'c2', from: 'pole-1', to: 'motor-1', type: 'wire' },
    { id: 'c3', from: 'motor-1', to: 'junction-1', type: 'pipe' },
    { id: 'c4', from: 'junction-1', to: 'valve-1', type: 'pipe' },
    { id: 'c5', from: 'junction-1', to: 'valve-2', type: 'pipe' },
  ],
};

const deliveryAddress = {
  line1: 'Parkhe Vasti, near Bhujbal Chowk',
  line2: 'Lamkani',
  city: 'Dhule',
  state: 'Maharashtra',
  pincode: '424001',
};

function productOrderItem(p, qty) {
  return {
    product_id: p.id,
    product_name: p.name,
    product_image: p.image_url,
    category: p.category,
    unit: p.unit,
    price: p.price,
    original_price: p.original_price,
    qty,
  };
}

async function insertOrder(userId, status, items, paymentMethod, daysAgo) {
  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
  const deliveryCharge = paymentMethod === 'cod' ? 20 : 0;
  const discount = 0;
  const total = subtotal + deliveryCharge - discount;
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const order = await db.query(
    `INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
    [userId, status, paymentMethod, JSON.stringify(deliveryAddress), subtotal, deliveryCharge, discount, total, createdAt]
  );
  const orderId = order.rows[0].id;

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, category, unit, price, original_price, qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [orderId, item.product_id, item.product_name, item.product_image, item.category, item.unit, item.price, item.original_price, item.qty]
    );
  }
  console.log(`Order #${orderId} (${status}) — ₹${total} — ${items.length} item(s)`);
  return orderId;
}

async function main() {
  // ── 1. User ──────────────────────────────────────────────────────────
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [USER.email]);
  let userId;
  if (existing.rows.length) {
    userId = existing.rows[0].id;
    console.log(`User already exists: id ${userId}`);
  } else {
    const passwordHash = await bcrypt.hash(USER.password, 10);
    const result = await db.query(
      `INSERT INTO users (organization_id, name, email, password_hash, phone, role, residential_address, postal_address, analytics_opt_in)
       VALUES ($1, $2, $3, $4, $5, 'owner', $6, $6, true) RETURNING id`,
      [ORG_ID, USER.name, USER.email, passwordHash, USER.phone, JSON.stringify(deliveryAddress)]
    );
    userId = result.rows[0].id;
    console.log(`Created user: id ${userId}, email ${USER.email}`);
  }

  // ── 2. Farm diagram ──────────────────────────────────────────────────
  await db.query(`UPDATE farms SET diagram = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(diagram), FARM_ID]);
  console.log(`Updated farm ${FARM_ID} diagram (${diagram.elements.length} elements, ${diagram.connections.length} connections)`);

  // ── 3. Orders ────────────────────────────────────────────────────────
  const products = (await db.query('SELECT id, name, image_url, category, unit, price, original_price FROM products ORDER BY id')).rows;
  const byName = (name) => products.find((p) => p.name === name) || products[0];

  await insertOrder(userId, 'delivered', [
    productOrderItem(byName('Hybrid Tomato Seeds'), 2),
    productOrderItem(byName('NPK Fertilizer 19-19-19'), 1),
  ], 'cod', 14);

  await insertOrder(userId, 'shipped', [
    productOrderItem(byName('Netafim Drip Irrigation Kit (1 Acre)'), 1),
  ], 'upi', 3);

  await insertOrder(userId, 'confirmed', [
    productOrderItem(byName('Bayer Confidor Insecticide'), 2),
    productOrderItem(byName('Falcon Garden Spade'), 1),
  ], 'cod', 1);

  await insertOrder(userId, 'placed', [
    productOrderItem(byName('Kirloskar Submersible Pump Motor (1 HP)'), 1),
  ], 'card', 0);

  await insertOrder(userId, 'cancelled', [
    productOrderItem(byName('IFFCO Urea Fertilizer'), 3),
  ], 'cod', 20);

  // ── 4. Alerts (feed into the Messages/notifications screen) ─────────
  const alerts = [
    {
      severity: 'warning', resolved: true, daysAgo: 6,
      message: '"Main Motor" exceeded max runtime (45 min) and was switched off',
      template: 'safety_cutoff', params: { name: 'Main Motor', minutes: 45 },
    },
    {
      severity: 'critical', resolved: true, daysAgo: 4,
      message: 'Device "Main Controller" went offline',
      template: 'device_offline_went', params: { name: 'Main Controller' },
    },
    {
      severity: 'critical', resolved: false, daysAgo: 0,
      message: 'Device "Main Controller" stopped responding',
      template: 'device_offline_stopped', params: { name: 'Main Controller' },
    },
  ];
  for (const a of alerts) {
    const createdAt = new Date(Date.now() - a.daysAgo * 24 * 60 * 60 * 1000);
    const resolvedAt = a.resolved ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null;
    await db.query(
      `INSERT INTO alerts (organization_id, device_id, actuator_id, alert_type, severity, message, message_template, message_params, is_resolved, resolved_at, created_at)
       VALUES ($1, $2, $3, 'safety_cutoff', $4, $5, $6, $7, $8, $9, $10)`,
      [ORG_ID, DEVICE_ID, ACTUATOR_ID, a.severity, a.message, a.template, JSON.stringify(a.params), a.resolved, resolvedAt, createdAt]
    );
  }
  console.log(`Inserted ${alerts.length} alerts`);

  // ── 5. Irrigation run (completed) ───────────────────────────────────
  const startedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const completedAt = new Date(startedAt.getTime() + 25 * 60 * 1000);
  await db.query(
    `INSERT INTO irrigation_runs (plan_name, farm_id, organization_id, status, current_step, total_steps, triggered_by, started_at, completed_at)
     VALUES ($1, $2, $3, 'completed', 2, 2, 'schedule', $4, $5)`,
    ['Morning Irrigation Cycle', FARM_ID, ORG_ID, startedAt, completedAt]
  );
  console.log('Inserted 1 irrigation run');

  console.log('\nDone. Login with:');
  console.log(`  email:    ${USER.email}`);
  console.log(`  password: ${USER.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
