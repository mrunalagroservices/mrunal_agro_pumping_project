const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

const ME_COLUMNS = 'id, name, electricity_rate_per_kwh, support_email, support_phone, support_hours';

// GET /api/v1/organizations/me
router.get('/me', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ${ME_COLUMNS} FROM organizations WHERE id = $1`,
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
  const { electricity_rate_per_kwh, support_email, support_phone, support_hours } = req.body;
  try {
    const result = await db.query(
      `UPDATE organizations SET
         electricity_rate_per_kwh = COALESCE($1, electricity_rate_per_kwh),
         support_email            = COALESCE($2, support_email),
         support_phone            = COALESCE($3, support_phone),
         support_hours            = COALESCE($4, support_hours),
         updated_at               = NOW()
       WHERE id = $5 RETURNING ${ME_COLUMNS}`,
      [electricity_rate_per_kwh, support_email, support_phone, support_hours, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Organizations]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
});

module.exports = router;
