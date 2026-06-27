const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/v1/home-sections — public, active homepage product rows in order.
// Returns only the section config; the client derives the actual products from
// the already-loaded /products list (avoids N extra queries per page load).
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, subtitle, source, category, layout, max_items, sort_order
       FROM home_product_sections
       WHERE is_active = true
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[HomeSections GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch home sections' });
  }
});

module.exports = router;
