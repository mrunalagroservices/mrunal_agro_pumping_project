const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/organizations/me
router.get('/me', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, electricity_rate_per_kwh FROM organizations WHERE id = $1`,
      [req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Organizations]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch organization' });
  }
});

// PUT /api/v1/organizations/me
router.put('/me', async (req, res) => {
  const { electricity_rate_per_kwh } = req.body;
  try {
    const result = await db.query(
      `UPDATE organizations SET
         electricity_rate_per_kwh = COALESCE($1, electricity_rate_per_kwh),
         updated_at               = NOW()
       WHERE id = $2 RETURNING id, name, electricity_rate_per_kwh`,
      [electricity_rate_per_kwh, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Organizations]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
});

module.exports = router;
