const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.use(requireAuth, requireAdmin);

// GET /api/v1/admin/stats — platform-wide counters
router.get('/stats', async (req, res) => {
  try {
    const [farmers, farms, devices, actuators] = await Promise.all([
      db.query('SELECT COUNT(*) FROM organizations'),
      db.query('SELECT COUNT(*) FROM farms'),
      db.query(`SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE status = 'online') AS online
                FROM devices`),
      db.query(`SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE current_state = 'on') AS running
                FROM actuators`),
    ]);
    res.json({
      success: true,
      data: {
        farmers: Number(farmers.rows[0].count),
        farms: Number(farms.rows[0].count),
        devices: {
          total: Number(devices.rows[0].total),
          online: Number(devices.rows[0].online),
        },
        actuators: {
          total: Number(actuators.rows[0].total),
          running: Number(actuators.rows[0].running),
        },
      },
    });
  } catch (err) {
    console.error('[Admin/stats]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// GET /api/v1/admin/farmers — all organizations with joined stats
router.get('/farmers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        o.id,
        o.name AS org_name,
        o.created_at,
        u.name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        u.id AS owner_id,
        COUNT(DISTINCT f.id)::int AS farm_count,
        COUNT(DISTINCT d.id)::int AS device_count,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'online')::int AS online_device_count,
        COUNT(DISTINCT a.id)::int AS actuator_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.current_state = 'on')::int AS running_actuator_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
      LEFT JOIN farms f ON f.organization_id = o.id
      LEFT JOIN devices d ON d.organization_id = o.id
      LEFT JOIN actuators a ON a.organization_id = o.id
      GROUP BY o.id, o.name, o.created_at, u.name, u.email, u.phone, u.id
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin/farmers]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch farmers' });
  }
});

// GET /api/v1/admin/farmers/:orgId — detail: farms + devices + actuators
router.get('/farmers/:orgId', async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [org, farms, devices, actuators] = await Promise.all([
      db.query(
        `SELECT o.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
         FROM organizations o
         LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
         WHERE o.id = $1`,
        [orgId]
      ),
      db.query('SELECT * FROM farms WHERE organization_id = $1 ORDER BY created_at', [orgId]),
      db.query('SELECT id, name, device_type, status, last_seen_at, farm_id FROM devices WHERE organization_id = $1 ORDER BY created_at', [orgId]),
      db.query('SELECT id, name, actuator_type, current_state, device_id, farm_id FROM actuators WHERE organization_id = $1 ORDER BY created_at', [orgId]),
    ]);
    if (!org.rows.length) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({
      success: true,
      data: {
        organization: org.rows[0],
        farms: farms.rows,
        devices: devices.rows,
        actuators: actuators.rows,
      },
    });
  } catch (err) {
    console.error('[Admin/farmers/:id]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch farmer details' });
  }
});

// GET /api/v1/admin/products
router.get('/products', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// POST /api/v1/admin/products
router.post('/products', async (req, res) => {
  const { name, description, category, price, original_price, unit, image_url, is_best_seller, is_active, stock_quantity } = req.body;
  if (!name || !price || !original_price || !category) {
    return res.status(400).json({ success: false, message: 'name, category, price and original_price are required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO products (name, description, category, price, original_price, unit, image_url, is_best_seller, is_active, stock_quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, description || null, category, price, original_price, unit || null, image_url || null,
       is_best_seller ?? false, is_active ?? true, stock_quantity ?? 100]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Admin/products POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /api/v1/admin/products/:id
router.put('/products/:id', async (req, res) => {
  const { name, description, category, price, original_price, unit, image_url, is_best_seller, is_active, stock_quantity } = req.body;
  try {
    const result = await db.query(
      `UPDATE products SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         price = COALESCE($4, price),
         original_price = COALESCE($5, original_price),
         unit = COALESCE($6, unit),
         image_url = COALESCE($7, image_url),
         is_best_seller = COALESCE($8, is_best_seller),
         is_active = COALESCE($9, is_active),
         stock_quantity = COALESCE($10, stock_quantity),
         updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [name, description, category, price, original_price, unit, image_url, is_best_seller, is_active, stock_quantity, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Admin/products PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /api/v1/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// ── Farms CRUD ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/farms — all farms across all orgs
router.get('/farms', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.*, o.name AS org_name,
        COUNT(DISTINCT d.id)::int AS device_count,
        COUNT(DISTINCT a.id)::int AS actuator_count
      FROM farms f
      LEFT JOIN organizations o ON o.id = f.organization_id
      LEFT JOIN devices d ON d.farm_id = f.id
      LEFT JOIN actuators a ON a.farm_id = f.id
      GROUP BY f.id, o.name
      ORDER BY f.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch farms' });
  }
});

// PUT /api/v1/admin/farms/:id
router.put('/farms/:id', async (req, res) => {
  const { name, location } = req.body;
  try {
    const result = await db.query(
      `UPDATE farms SET name = COALESCE($1, name), location = COALESCE($2, location) WHERE id = $3 RETURNING *`,
      [name, location, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Farm not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update farm' });
  }
});

// DELETE /api/v1/admin/farms/:id
router.delete('/farms/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM farms WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Farm not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete farm' });
  }
});

// ── Devices CRUD ───────────────────────────────────────────────────────────────

// GET /api/v1/admin/devices — all devices
router.get('/devices', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, f.name AS farm_name, o.name AS org_name,
        COUNT(DISTINCT a.id)::int AS actuator_count,
        COUNT(DISTINCT s.id)::int AS sensor_count
      FROM devices d
      LEFT JOIN farms f ON f.id = d.farm_id
      LEFT JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN actuators a ON a.device_id = d.id
      LEFT JOIN sensors s ON s.device_id = d.id
      GROUP BY d.id, f.name, o.name
      ORDER BY d.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch devices' });
  }
});

// PUT /api/v1/admin/devices/:id
router.put('/devices/:id', async (req, res) => {
  const { name, device_type } = req.body;
  try {
    const result = await db.query(
      `UPDATE devices SET name = COALESCE($1, name), device_type = COALESCE($2, device_type) WHERE id = $3 RETURNING *`,
      [name, device_type, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update device' });
  }
});

// DELETE /api/v1/admin/devices/:id
router.delete('/devices/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM devices WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete device' });
  }
});

// ── Orders (admin) ─────────────────────────────────────────────────────────────

// GET /api/v1/admin/orders — all orders with user info + items
router.get('/orders', async (req, res) => {
  try {
    const ordersRes = await db.query(`
      SELECT o.*,
        u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 200
    `);
    const orders = ordersRes.rows;
    if (!orders.length) return res.json({ success: true, data: [] });

    const orderIds = orders.map((o) => o.id);
    const itemsRes = await db.query(
      `SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id`,
      [orderIds]
    );
    const itemsByOrder = itemsRes.rows.reduce((acc, item) => {
      (acc[item.order_id] = acc[item.order_id] || []).push(item);
      return acc;
    }, {});

    res.json({ success: true, data: orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] })) });
  } catch (err) {
    console.error('[Admin/orders GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// PUT /api/v1/admin/orders/:id — update order status
router.put('/orders/:id', async (req, res) => {
  const { status } = req.body;
  const valid = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${valid.join(', ')}` });
  }
  try {
    const result = await db.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Admin/orders PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

// ── Search history (admin) ──────────────────────────────────────────────────────

// GET /api/v1/admin/search-history
router.get('/search-history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const search = req.query.q || '';
  try {
    const result = await db.query(`
      SELECT sh.id, sh.query, sh.results_count, sh.created_at,
        u.name AS user_name, u.email AS user_email
      FROM search_history sh
      LEFT JOIN users u ON u.id = sh.user_id
      WHERE ($1 = '' OR sh.query ILIKE $2 OR u.name ILIKE $2)
      ORDER BY sh.created_at DESC
      LIMIT $3
    `, [search, `%${search}%`, limit]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin/search-history]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch search history' });
  }
});

// ── Shop settings (admin) ──────────────────────────────────────────────────────

// GET /api/v1/admin/shop-settings
router.get('/shop-settings', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value, updated_by, updated_at FROM shop_settings ORDER BY key');
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch shop settings' });
  }
});

// PUT /api/v1/admin/shop-settings — update one or more keys
router.put('/shop-settings', async (req, res) => {
  const updates = req.body; // { key: value, ... }
  if (!updates || typeof updates !== 'object' || !Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: 'Request body must be a non-empty object of {key: value}' });
  }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO shop_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_by = $3, updated_at = NOW()`,
        [key, JSON.stringify(value), req.user.id]
      );
    }
    const result = await db.query('SELECT key, value FROM shop_settings ORDER BY key');
    const settings = result.rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[Admin/shop-settings PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update shop settings' });
  }
});

// ── Users ──────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/users — list all non-admin users with order count
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id, u.name, u.email, u.phone, u.role, u.created_at,
        o.name AS org_name,
        COUNT(DISTINCT ord.id) AS order_count,
        MAX(ord.created_at)    AS last_order_at
      FROM users u
      JOIN organizations o ON o.id = u.organization_id
      LEFT JOIN orders ord ON ord.user_id = u.id
      WHERE u.is_admin = false
      GROUP BY u.id, o.name
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Admin/users GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET /api/v1/admin/users/:id — full user profile
router.get('/users/:id', async (req, res) => {
  try {
    const uid = req.params.id;

    // User + org info
    const userRes = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
             o.name AS org_name, o.id AS org_id
      FROM users u
      JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1
    `, [uid]);
    if (!userRes.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    // Orders with items
    const ordersRes = await db.query(`
      SELECT o.id, o.status, o.payment_method, o.delivery_address,
             o.subtotal, o.delivery_charge, o.discount, o.total,
             o.coupon_code, o.created_at
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 50
    `, [uid]);

    let orders = ordersRes.rows;
    if (orders.length) {
      const orderIds = orders.map((o) => o.id);
      const itemsRes = await db.query(
        `SELECT * FROM order_items WHERE order_id = ANY($1)`,
        [orderIds]
      );
      const itemsByOrder = {};
      itemsRes.rows.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
      orders = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    }

    // Cart
    const cartRes = await db.query('SELECT items FROM user_carts WHERE user_id = $1', [uid]);
    const cartItems = cartRes.rows[0]?.items ?? [];

    // Top searches
    const searchRes = await db.query(`
      SELECT query, COUNT(*) AS count
      FROM search_history
      WHERE user_id = $1
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10
    `, [uid]);

    // Payment preference
    const paymentRes = await db.query(`
      SELECT payment_method, COUNT(*) AS count
      FROM orders
      WHERE user_id = $1
      GROUP BY payment_method
      ORDER BY count DESC
    `, [uid]);

    res.json({
      success: true,
      data: {
        user: userRes.rows[0],
        orders,
        cart: cartItems,
        top_searches: searchRes.rows,
        payment_methods: paymentRes.rows,
      },
    });
  } catch (err) {
    console.error('[Admin/users/:id GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

// ── Farmers (org) delete ───────────────────────────────────────────────────────

// DELETE /api/v1/admin/farmers/:orgId
router.delete('/farmers/:orgId', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM organizations WHERE id = $1 RETURNING id', [req.params.orgId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Organisation not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete organisation' });
  }
});

module.exports = router;
