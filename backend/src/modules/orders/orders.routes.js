const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// POST /api/v1/orders — place an order
router.post('/', async (req, res) => {
  const { items, delivery_address, payment_method, coupon_code, subtotal, delivery_charge, discount, total } = req.body;

  if (!items?.length || !delivery_address || !payment_method) {
    return res.status(400).json({ success: false, message: 'items, delivery_address and payment_method are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, status, payment_method, delivery_address, subtotal, delivery_charge, discount, total, coupon_code)
       VALUES ($1, 'placed', $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.id,
        payment_method,
        JSON.stringify(delivery_address),
        Number(subtotal) || 0,
        Number(delivery_charge) || 0,
        Number(discount) || 0,
        Number(total) || 0,
        coupon_code || null,
      ]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, category, unit, price, original_price, qty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          item.product_id || null,
          item.product_name,
          item.product_image || null,
          item.category || null,
          item.unit || null,
          Number(item.price),
          item.original_price ? Number(item.original_price) : null,
          Number(item.qty),
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Orders POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  } finally {
    client.release();
  }
});

// GET /api/v1/orders/mine — current user's orders with items
router.get('/mine', async (req, res) => {
  try {
    const ordersRes = await db.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
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
    console.error('[Orders GET mine]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch orders' });
  }
});

module.exports = router;
