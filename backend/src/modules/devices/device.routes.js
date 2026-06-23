const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/database');
const { requireAuth, requireDeviceApiKey } = require('../../middleware/auth');
const { emitToOrg } = require('../../config/socket');

// ── ESP32 ingest (API key auth, no JWT needed) ────────────────────────────────
// POST /api/v1/devices/ingest/power-event
// Body: { event_type: "power_on" | "power_off" }
// Header: x-api-key: <device api key>
router.post('/ingest/power-event', requireDeviceApiKey, async (req, res) => {
  const { event_type } = req.body;
  if (!['power_on', 'power_off'].includes(event_type)) {
    return res.status(400).json({ success: false, message: 'event_type must be power_on or power_off' });
  }
  try {
    const created = await db.query(
      `INSERT INTO power_events (organization_id, device_id, event_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.device.organization_id, req.device.id, event_type]
    );
    emitToOrg(req.device.organization_id, 'power-event', {
      device_id: req.device.id,
      device_name: req.device.name,
      event_type,
      created_at: created.rows[0].created_at,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[PowerEvent]', err.message);
    res.status(500).json({ success: false, message: 'Failed to record power event' });
  }
});

router.use(requireAuth);

function generateApiKey() {
  return `pump_${crypto.randomBytes(16).toString('hex')}`;
}

// GET /api/v1/devices
router.get('/', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE d.organization_id = $1`;
    if (farm_id) { params.push(farm_id); where += ` AND d.farm_id = $${params.length}`; }

    const result = await db.query(
      `SELECT d.*, f.name AS farm_name,
              COUNT(DISTINCT s.id) AS sensor_count,
              COUNT(DISTINCT a.id) AS actuator_count
       FROM devices d
       LEFT JOIN farms f ON f.id = d.farm_id
       LEFT JOIN sensors s ON s.device_id = d.id
       LEFT JOIN actuators a ON a.device_id = d.id
       ${where}
       GROUP BY d.id, f.name
       ORDER BY d.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Devices]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch devices' });
  }
});

// POST /api/v1/devices — provision a new ESP32 gateway
router.post('/', async (req, res) => {
  const { name, farm_id, device_type, relay_count } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });

  try {
    const result = await db.query(
      `INSERT INTO devices (organization_id, farm_id, name, api_key, device_type, relay_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.organization_id, farm_id || null, name, generateApiKey(), device_type || 'esp32_gateway', relay_count || 4]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Devices]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create device' });
  }
});

// GET /api/v1/devices/:id — detail with sensors + actuators
router.get('/:id', async (req, res) => {
  try {
    const device = await db.query(
      `SELECT d.*, f.name AS farm_name FROM devices d
       LEFT JOIN farms f ON f.id = d.farm_id
       WHERE d.id = $1 AND d.organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!device.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const sensors = await db.query(`SELECT * FROM sensors WHERE device_id = $1 ORDER BY name`, [req.params.id]);
    const actuators = await db.query(`SELECT * FROM actuators WHERE device_id = $1 ORDER BY relay_channel`, [req.params.id]);
    const logs = await db.query(
      `SELECT * FROM device_logs WHERE device_id = $1 ORDER BY created_at DESC LIMIT 20`, [req.params.id]
    );

    res.json({ success: true, data: { ...device.rows[0], sensors: sensors.rows, actuators: actuators.rows, logs: logs.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch device' });
  }
});

// PUT /api/v1/devices/:id
router.put('/:id', async (req, res) => {
  const { name, farm_id, status, relay_count } = req.body;
  try {
    const result = await db.query(
      `UPDATE devices SET
         name        = COALESCE($1, name),
         farm_id     = COALESCE($2, farm_id),
         status      = COALESCE($3, status),
         relay_count = COALESCE($4, relay_count),
         updated_at  = NOW()
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [name, farm_id, status, relay_count, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update device' });
  }
});

// POST /api/v1/devices/:id/regenerate-key
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE devices SET api_key = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [generateApiKey(), req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to regenerate key' });
  }
});

// GET /api/v1/devices/:id/power-events?days=7
// Returns chronological list of power_on / power_off events for the last N days.
router.get('/:id/power-events', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  try {
    const check = await db.query(
      'SELECT id FROM devices WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organization_id]
    );
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await db.query(
      `SELECT event_type, created_at
       FROM power_events
       WHERE device_id = $1
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       ORDER BY created_at ASC`,
      [req.params.id, days]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[PowerEvents]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch power events' });
  }
});

// DELETE /api/v1/devices/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM devices WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete device' });
  }
});

module.exports = router;
