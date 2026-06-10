const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/schedules
router.get('/', async (req, res) => {
  try {
    const { actuator_id } = req.query;
    const params = [req.user.organization_id];
    let where = `WHERE sch.organization_id = $1`;
    if (actuator_id) { params.push(actuator_id); where += ` AND sch.actuator_id = $${params.length}`; }

    const result = await db.query(
      `SELECT sch.*, a.name AS actuator_name FROM schedules sch
       JOIN actuators a ON a.id = sch.actuator_id
       ${where}
       ORDER BY sch.start_time`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Schedules]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
});

// POST /api/v1/schedules
router.post('/', async (req, res) => {
  const { actuator_id, name, days_of_week, start_time, duration_minutes } = req.body;
  if (!actuator_id || !name || !start_time || !duration_minutes) {
    return res.status(400).json({ success: false, message: 'actuator_id, name, start_time and duration_minutes are required' });
  }

  try {
    const actuator = await db.query(`SELECT id FROM actuators WHERE id = $1 AND organization_id = $2`, [actuator_id, req.user.organization_id]);
    if (!actuator.rows.length) return res.status(404).json({ success: false, message: 'Actuator not found' });

    const result = await db.query(
      `INSERT INTO schedules (organization_id, actuator_id, name, days_of_week, start_time, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.organization_id, actuator_id, name, days_of_week || [0, 1, 2, 3, 4, 5, 6], start_time, duration_minutes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Schedules]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
});

// PUT /api/v1/schedules/:id
router.put('/:id', async (req, res) => {
  const { name, days_of_week, start_time, duration_minutes, is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE schedules SET
         name             = COALESCE($1, name),
         days_of_week     = COALESCE($2, days_of_week),
         start_time       = COALESCE($3, start_time),
         duration_minutes = COALESCE($4, duration_minutes),
         is_active        = COALESCE($5, is_active),
         updated_at       = NOW()
       WHERE id = $6 AND organization_id = $7 RETURNING *`,
      [name, days_of_week, start_time, duration_minutes, is_active, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule' });
  }
});

// DELETE /api/v1/schedules/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM schedules WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete schedule' });
  }
});

module.exports = router;
