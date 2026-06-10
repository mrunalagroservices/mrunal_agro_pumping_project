const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/sensors
router.get('/', async (req, res) => {
  try {
    const { device_id, farm_id } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE s.organization_id = $1`;
    if (device_id) { params.push(device_id); where += ` AND s.device_id = $${params.length}`; }
    if (farm_id)   { params.push(farm_id);   where += ` AND s.farm_id = $${params.length}`; }

    const result = await db.query(
      `SELECT s.*, d.name AS device_name,
              CASE
                WHEN s.max_threshold IS NOT NULL AND s.current_value > s.max_threshold THEN 'above'
                WHEN s.min_threshold IS NOT NULL AND s.current_value < s.min_threshold THEN 'below'
                ELSE 'normal'
              END AS alert_state
       FROM sensors s
       LEFT JOIN devices d ON d.id = s.device_id
       ${where}
       ORDER BY s.name`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Sensors]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sensors' });
  }
});

// POST /api/v1/sensors — register a sensor channel for a device
router.post('/', async (req, res) => {
  const { device_id, farm_id, name, sensor_type, channel, unit, min_threshold, max_threshold } = req.body;
  if (!device_id || !name || !sensor_type || !channel) {
    return res.status(400).json({ success: false, message: 'device_id, name, sensor_type and channel are required' });
  }

  try {
    const device = await db.query(`SELECT id FROM devices WHERE id = $1 AND organization_id = $2`, [device_id, req.user.organization_id]);
    if (!device.rows.length) return res.status(404).json({ success: false, message: 'Device not found' });

    const result = await db.query(
      `INSERT INTO sensors (organization_id, device_id, farm_id, name, sensor_type, channel, unit, min_threshold, max_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.organization_id, device_id, farm_id || null, name, sensor_type, channel, unit || null, min_threshold ?? null, max_threshold ?? null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Sensors]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create sensor' });
  }
});

// PUT /api/v1/sensors/:id — update name/thresholds/status
router.put('/:id', async (req, res) => {
  const { name, min_threshold, max_threshold, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE sensors SET
         name          = COALESCE($1, name),
         min_threshold = $2,
         max_threshold = $3,
         status        = COALESCE($4, status),
         updated_at    = NOW()
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [name, min_threshold, max_threshold, status, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update sensor' });
  }
});

// GET /api/v1/sensors/:id/readings?hours=24 — history for charts
router.get('/:id/readings', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours, 10) || 24, 24 * 30);
  try {
    const sensor = await db.query(`SELECT id FROM sensors WHERE id = $1 AND organization_id = $2`, [req.params.id, req.user.organization_id]);
    if (!sensor.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await db.query(
      `SELECT value, recorded_at FROM sensor_readings
       WHERE sensor_id = $1 AND recorded_at > NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at ASC`,
      [req.params.id, hours]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch readings' });
  }
});

// DELETE /api/v1/sensors/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM sensors WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Sensor deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete sensor' });
  }
});

module.exports = router;
