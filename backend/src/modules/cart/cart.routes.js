const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// PUT /api/v1/cart — upsert cart snapshot for the logged-in user
router.put('/', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items must be an array' });
    }
    await db.query(
      `INSERT INTO user_carts (user_id, items, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET items = $2, updated_at = NOW()`,
      [req.user.id, JSON.stringify(items)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Cart PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save cart' });
  }
});

// GET /api/v1/cart — get current user's server-side cart
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT items FROM user_carts WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, data: result.rows[0]?.items ?? [] });
  } catch (err) {
    console.error('[Cart GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

module.exports = router;
