const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/alerts?resolved=false
router.get('/', async (req, res) => {
  try {
    const { resolved, severity } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE a.organization_id = $1`;
    if (resolved !== undefined) { params.push(resolved === 'true'); where += ` AND a.is_resolved = $${params.length}`; }
    if (severity) { params.push(severity); where += ` AND a.severity = $${params.length}`; }

    const result = await db.query(
      `SELECT a.*, d.name AS device_name, s.name AS sensor_name, act.name AS actuator_name
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       LEFT JOIN sensors s ON s.id = a.sensor_id
       LEFT JOIN actuators act ON act.id = a.actuator_id
       ${where}
       ORDER BY a.created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Alerts]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

// PUT /api/v1/alerts/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE alerts SET is_resolved = true, resolved_at = NOW()
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
});

module.exports = router;
