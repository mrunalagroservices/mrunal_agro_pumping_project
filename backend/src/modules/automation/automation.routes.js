const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

const VALID_CONDITIONS = ['<', '>', '<=', '>=', '=='];

// GET /api/v1/automation-rules
router.get('/', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE r.organization_id = $1`;
    if (farm_id) { params.push(farm_id); where += ` AND r.farm_id = $${params.length}`; }

    const result = await db.query(
      `SELECT r.*, s.name AS sensor_name, s.unit AS sensor_unit, a.name AS actuator_name
       FROM automation_rules r
       JOIN sensors s ON s.id = r.trigger_sensor_id
       JOIN actuators a ON a.id = r.action_actuator_id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Automation]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch automation rules' });
  }
});

// POST /api/v1/automation-rules
router.post('/', async (req, res) => {
  const {
    farm_id, name, trigger_sensor_id, trigger_condition, trigger_value,
    action_actuator_id, action_state, action_duration_minutes
  } = req.body;

  if (!name || !trigger_sensor_id || !trigger_condition || trigger_value === undefined || !action_actuator_id || !action_state) {
    return res.status(400).json({ success: false, message: 'name, trigger_sensor_id, trigger_condition, trigger_value, action_actuator_id and action_state are required' });
  }
  if (!VALID_CONDITIONS.includes(trigger_condition)) {
    return res.status(400).json({ success: false, message: `trigger_condition must be one of ${VALID_CONDITIONS.join(', ')}` });
  }
  if (!['on', 'off'].includes(action_state)) {
    return res.status(400).json({ success: false, message: "action_state must be 'on' or 'off'" });
  }

  try {
    const sensor = await db.query(`SELECT id FROM sensors WHERE id = $1 AND organization_id = $2`, [trigger_sensor_id, req.user.organization_id]);
    if (!sensor.rows.length) return res.status(404).json({ success: false, message: 'Sensor not found' });

    const actuator = await db.query(`SELECT id FROM actuators WHERE id = $1 AND organization_id = $2`, [action_actuator_id, req.user.organization_id]);
    if (!actuator.rows.length) return res.status(404).json({ success: false, message: 'Actuator not found' });

    const result = await db.query(
      `INSERT INTO automation_rules
         (organization_id, farm_id, name, trigger_sensor_id, trigger_condition, trigger_value,
          action_actuator_id, action_state, action_duration_minutes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.organization_id, farm_id || null, name, trigger_sensor_id, trigger_condition, trigger_value,
       action_actuator_id, action_state, action_duration_minutes || 0, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Automation]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create automation rule' });
  }
});

// PUT /api/v1/automation-rules/:id
router.put('/:id', async (req, res) => {
  const {
    name, trigger_condition, trigger_value, action_state, action_duration_minutes, is_active
  } = req.body;

  if (trigger_condition && !VALID_CONDITIONS.includes(trigger_condition)) {
    return res.status(400).json({ success: false, message: `trigger_condition must be one of ${VALID_CONDITIONS.join(', ')}` });
  }
  if (action_state && !['on', 'off'].includes(action_state)) {
    return res.status(400).json({ success: false, message: "action_state must be 'on' or 'off'" });
  }

  try {
    const result = await db.query(
      `UPDATE automation_rules SET
         name                    = COALESCE($1, name),
         trigger_condition       = COALESCE($2, trigger_condition),
         trigger_value           = COALESCE($3, trigger_value),
         action_state            = COALESCE($4, action_state),
         action_duration_minutes = COALESCE($5, action_duration_minutes),
         is_active               = COALESCE($6, is_active),
         updated_at              = NOW()
       WHERE id = $7 AND organization_id = $8 RETURNING *`,
      [name, trigger_condition, trigger_value, action_state, action_duration_minutes, is_active, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update automation rule' });
  }
});

// DELETE /api/v1/automation-rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM automation_rules WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Automation rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete automation rule' });
  }
});

module.exports = router;
