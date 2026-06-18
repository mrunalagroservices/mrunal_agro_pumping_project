const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /zones?farm_id= — all zones for a farm (with valve actuator state)
router.get('/', async (req, res) => {
  try {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ success: false, message: 'farm_id required' });

    const result = await db.query(
      `SELECT z.*,
              a.name AS valve_name,
              a.current_state AS valve_state,
              a.actuator_type AS valve_type
       FROM zones z
       LEFT JOIN actuators a ON a.id = z.valve_actuator_id
       WHERE z.farm_id = $1
         AND z.organization_id = $2
       ORDER BY z.created_at ASC`,
      [farm_id, req.user.organization_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Zones GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch zones' });
  }
});

// POST /zones — create zone
router.post('/', async (req, res) => {
  try {
    const { farm_id, name, crop_type, area_sqm, description, valve_actuator_id } = req.body;
    if (!farm_id || !name) return res.status(400).json({ success: false, message: 'farm_id and name required' });

    // Verify farm belongs to this org
    const farmCheck = await db.query(
      'SELECT id FROM farms WHERE id = $1 AND organization_id = $2',
      [farm_id, req.user.organization_id]
    );
    if (!farmCheck.rows.length) return res.status(403).json({ success: false, message: 'Farm not found' });

    const result = await db.query(
      `INSERT INTO zones (farm_id, organization_id, name, crop_type, area_sqm, description, valve_actuator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [farm_id, req.user.organization_id, name.trim(), crop_type || null, area_sqm || null, description || null, valve_actuator_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Zones POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create zone' });
  }
});

// PUT /zones/:id — update zone
router.put('/:id', async (req, res) => {
  try {
    const { name, crop_type, area_sqm, description, valve_actuator_id } = req.body;
    const result = await db.query(
      `UPDATE zones SET
         name              = COALESCE($1, name),
         crop_type         = $2,
         area_sqm          = $3,
         description       = $4,
         valve_actuator_id = $5,
         updated_at        = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [name || null, crop_type ?? null, area_sqm ?? null, description ?? null, valve_actuator_id ?? null, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Zone not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Zones PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update zone' });
  }
});

// DELETE /zones/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM zones WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Zone not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error('[Zones DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete zone' });
  }
});

// POST /zones/:id/valve — open or close the zone's solenoid valve directly
router.post('/:id/valve', async (req, res) => {
  try {
    const { state } = req.body; // 'on' | 'off'
    if (!['on', 'off'].includes(state)) return res.status(400).json({ success: false, message: "state must be 'on' or 'off'" });

    const zoneRes = await db.query(
      'SELECT valve_actuator_id FROM zones WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organization_id]
    );
    if (!zoneRes.rows.length) return res.status(404).json({ success: false, message: 'Zone not found' });
    const { valve_actuator_id } = zoneRes.rows[0];
    if (!valve_actuator_id) return res.status(400).json({ success: false, message: 'No valve assigned to this zone' });

    await db.query(
      `UPDATE actuators SET current_state = $1, updated_at = NOW() WHERE id = $2`,
      [state, valve_actuator_id]
    );
    res.json({ success: true, data: { valve_actuator_id, state } });
  } catch (err) {
    console.error('[Zones/valve]', err.message);
    res.status(500).json({ success: false, message: 'Failed to control valve' });
  }
});

module.exports = router;
