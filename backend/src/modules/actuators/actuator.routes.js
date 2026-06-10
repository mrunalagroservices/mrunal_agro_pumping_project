const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { publishCommand } = require('../../config/mqtt');
const { emitToOrg } = require('../../config/socket');

router.use(requireAuth);

// GET /api/v1/actuators
router.get('/', async (req, res) => {
  try {
    const { device_id, farm_id } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE a.organization_id = $1`;
    if (device_id) { params.push(device_id); where += ` AND a.device_id = $${params.length}`; }
    if (farm_id)   { params.push(farm_id);   where += ` AND a.farm_id = $${params.length}`; }

    const result = await db.query(
      `SELECT a.*, d.name AS device_name FROM actuators a
       LEFT JOIN devices d ON d.id = a.device_id
       ${where}
       ORDER BY a.device_id, a.relay_channel`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Actuators]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch actuators' });
  }
});

// POST /api/v1/actuators — register a relay channel as a motor/pump/valve
router.post('/', async (req, res) => {
  const { device_id, farm_id, name, actuator_type, relay_channel, max_runtime_minutes } = req.body;
  if (!device_id || !name || relay_channel === undefined) {
    return res.status(400).json({ success: false, message: 'device_id, name and relay_channel are required' });
  }

  try {
    const device = await db.query(`SELECT id FROM devices WHERE id = $1 AND organization_id = $2`, [device_id, req.user.organization_id]);
    if (!device.rows.length) return res.status(404).json({ success: false, message: 'Device not found' });

    const result = await db.query(
      `INSERT INTO actuators (organization_id, device_id, farm_id, name, actuator_type, relay_channel, max_runtime_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.organization_id, device_id, farm_id || null, name, actuator_type || 'motor', relay_channel, max_runtime_minutes || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Actuators]', err.message);
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'relay_channel already in use on this device' });
    res.status(500).json({ success: false, message: 'Failed to create actuator' });
  }
});

// PUT /api/v1/actuators/:id
router.put('/:id', async (req, res) => {
  const { name, actuator_type, auto_mode, max_runtime_minutes, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE actuators SET
         name                = COALESCE($1, name),
         actuator_type       = COALESCE($2, actuator_type),
         auto_mode           = COALESCE($3, auto_mode),
         max_runtime_minutes = $4,
         status              = COALESCE($5, status),
         updated_at          = NOW()
       WHERE id = $6 AND organization_id = $7 RETURNING *`,
      [name, actuator_type, auto_mode, max_runtime_minutes, status, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update actuator' });
  }
});

// POST /api/v1/actuators/:id/toggle — { state: 'on'|'off', duration_minutes? }
router.post('/:id/toggle', async (req, res) => {
  const { state, duration_minutes } = req.body;
  if (!['on', 'off'].includes(state)) {
    return res.status(400).json({ success: false, message: "state must be 'on' or 'off'" });
  }

  try {
    const actuator = await db.query(
      `SELECT a.*, d.api_key FROM actuators a
       JOIN devices d ON d.id = a.device_id
       WHERE a.id = $1 AND a.organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!actuator.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const act = actuator.rows[0];

    const durationSeconds = state === 'on' ? Math.max(0, parseInt(duration_minutes, 10) || 0) * 60 : 0;

    publishCommand(req.user.organization_id, act.api_key, {
      action: state === 'on' ? 'turn_on' : 'turn_off',
      actuator_id: act.id,
      actuator_name: act.name,
      relay_channel: act.relay_channel,
      state,
      duration: durationSeconds
    });

    // Optimistic state update — confirmed/corrected by the device's next status message
    const updated = await db.query(
      `UPDATE actuators SET
         current_state      = $1::varchar,
         last_turned_on_at  = CASE WHEN $1::varchar = 'on'  THEN NOW() ELSE last_turned_on_at  END,
         last_turned_off_at = CASE WHEN $1::varchar = 'off' THEN NOW() ELSE last_turned_off_at END,
         updated_at         = NOW()
       WHERE id = $2 RETURNING *`,
      [state, act.id]
    );

    await db.query(
      `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by, triggered_by_id, duration_minutes)
       VALUES ($1, $2, $3, 'user', $4, $5)`,
      [req.user.organization_id, act.id, state, req.user.id, state === 'on' ? (parseInt(duration_minutes, 10) || null) : null]
    );

    emitToOrg(req.user.organization_id, 'actuator-status', updated.rows[0]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    console.error('[Actuators/toggle]', err.message);
    res.status(500).json({ success: false, message: 'Failed to toggle actuator' });
  }
});

// GET /api/v1/actuators/:id/logs
router.get('/:id/logs', async (req, res) => {
  try {
    const actuator = await db.query(`SELECT id FROM actuators WHERE id = $1 AND organization_id = $2`, [req.params.id, req.user.organization_id]);
    if (!actuator.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await db.query(
      `SELECT * FROM actuator_logs WHERE actuator_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// DELETE /api/v1/actuators/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM actuators WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Actuator deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete actuator' });
  }
});

module.exports = router;
