const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/farms
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, COUNT(DISTINCT d.id) AS device_count
       FROM farms f
       LEFT JOIN devices d ON d.farm_id = f.id
       WHERE f.organization_id = $1
       GROUP BY f.id ORDER BY f.created_at DESC`,
      [req.user.organization_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Farms]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch farms' });
  }
});

// POST /api/v1/farms
router.post('/', async (req, res) => {
  const { name, location, latitude, longitude } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });

  try {
    const result = await db.query(
      `INSERT INTO farms (organization_id, name, location, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.organization_id, name, location || null, latitude || null, longitude || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Farms]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create farm' });
  }
});

// GET /api/v1/farms/:id
router.get('/:id', async (req, res) => {
  try {
    const farm = await db.query(
      `SELECT * FROM farms WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const devices = await db.query(
      `SELECT id, name, status, last_seen_at FROM devices WHERE farm_id = $1 ORDER BY name`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...farm.rows[0], devices: devices.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch farm' });
  }
});

// PUT /api/v1/farms/:id
router.put('/:id', async (req, res) => {
  const { name, location, latitude, longitude } = req.body;
  try {
    const result = await db.query(
      `UPDATE farms SET
         name       = COALESCE($1, name),
         location   = COALESCE($2, location),
         latitude   = COALESCE($3, latitude),
         longitude  = COALESCE($4, longitude),
         updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [name, location, latitude, longitude, req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update farm' });
  }
});

// GET /api/v1/farms/:id/diagram
router.get('/:id/diagram', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT diagram FROM farms WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0].diagram || { elements: [], connections: [] } });
  } catch (err) {
    console.error('[Farms/diagram]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch diagram' });
  }
});

// PUT /api/v1/farms/:id/diagram
router.put('/:id/diagram', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE farms SET diagram = $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 RETURNING diagram`,
      [JSON.stringify(req.body), req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0].diagram });
  } catch (err) {
    console.error('[Farms/diagram]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save diagram' });
  }
});

// DELETE /api/v1/farms/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM farms WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Farm deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete farm' });
  }
});

module.exports = router;
