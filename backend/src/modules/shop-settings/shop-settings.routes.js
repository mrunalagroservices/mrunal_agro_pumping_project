const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// GET /api/v1/shop-settings — public, returns all settings as a flat object
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM shop_settings ORDER BY key');
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[ShopSettings GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch shop settings' });
  }
});

// POST /api/v1/shop-settings/validate-coupon — validate coupon code against DB
router.post('/validate-coupon', async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code?.trim()) return res.status(400).json({ success: false, message: 'code is required' });

  try {
    const result = await db.query(`SELECT value FROM shop_settings WHERE key = 'coupons'`);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Invalid coupon' });

    const coupons = result.rows[0].value;
    const coupon = coupons.find((c) => c.code === code.trim().toUpperCase() && c.is_active);

    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });

    const sub = Number(subtotal) || 0;
    if (sub < (coupon.min_order || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${coupon.min_order} required for this coupon`,
      });
    }

    const discount = coupon.type === 'percent'
      ? Math.round(sub * coupon.value / 100)
      : coupon.value;

    res.json({ success: true, data: { coupon, discount } });
  } catch (err) {
    console.error('[ShopSettings validate-coupon]', err.message);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});

// GET /api/v1/shop-settings/my-coupons — coupons the current user has saved
router.get('/my-coupons', requireAuth, async (req, res) => {
  try {
    const saved = await db.query(
      `SELECT code FROM user_saved_coupons WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    const settingsRes = await db.query(`SELECT value FROM shop_settings WHERE key = 'coupons'`);
    const allCoupons = settingsRes.rows[0]?.value || [];

    const data = saved.rows.map((row) => {
      const coupon = allCoupons.find((c) => c.code === row.code);
      return coupon
        ? { ...coupon, is_active: !!coupon.is_active }
        : { code: row.code, is_active: false, expired: true };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ShopSettings my-coupons GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch your coupons' });
  }
});

// POST /api/v1/shop-settings/my-coupons — save a coupon code to the account
// Checks the code exists and is active (does NOT require a cart/subtotal —
// that check happens separately at actual checkout time).
router.post('/my-coupons', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ success: false, message: 'code is required' });

  try {
    const settingsRes = await db.query(`SELECT value FROM shop_settings WHERE key = 'coupons'`);
    const allCoupons = settingsRes.rows[0]?.value || [];
    const normalized = code.trim().toUpperCase();
    const coupon = allCoupons.find((c) => c.code === normalized && c.is_active);

    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });

    await db.query(
      `INSERT INTO user_saved_coupons (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id, code) DO NOTHING`,
      [req.user.id, normalized]
    );
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    console.error('[ShopSettings my-coupons POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save coupon' });
  }
});

module.exports = router;
