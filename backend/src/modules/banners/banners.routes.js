const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/v1/banners — public, active Mandi homepage promo banners
// (the carousel on the dashboard's /shop page and the mobile Market screen)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, subtitle, image_url, gradient_from, gradient_to, icon, link_url, sort_order
       FROM shop_banners
       WHERE is_active = true
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Banners GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

module.exports = router;
