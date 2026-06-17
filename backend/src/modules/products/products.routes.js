const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// GET /api/v1/products — active products visible to authenticated users
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM products WHERE is_active = true ORDER BY is_best_seller DESC, rating DESC, created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Products GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

module.exports = router;
