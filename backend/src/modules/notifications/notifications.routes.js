const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/notifications — unified feed: pump/farm alerts + order status
// updates + irrigation run completions, merged and sorted by time.
router.get('/', async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    const alertsRes = await db.query(
      `SELECT a.id, a.alert_type, a.severity, a.message, a.is_resolved, a.created_at,
              d.name AS device_name, s.name AS sensor_name, act.name AS actuator_name
       FROM alerts a
       LEFT JOIN devices d ON d.id = a.device_id
       LEFT JOIN sensors s ON s.id = a.sensor_id
       LEFT JOIN actuators act ON act.id = a.actuator_id
       WHERE a.organization_id = $1
       ORDER BY a.created_at DESC LIMIT 100`,
      [orgId]
    );

    const ordersRes = await db.query(
      `SELECT id, status, total, updated_at FROM orders
       WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );

    const runsRes = await db.query(
      `SELECT id, plan_name, status, completed_at FROM irrigation_runs
       WHERE organization_id = $1 AND status IN ('completed', 'aborted') AND completed_at IS NOT NULL
       ORDER BY completed_at DESC LIMIT 50`,
      [orgId]
    );

    const alertItems = alertsRes.rows.map((a) => ({
      id: `alert-${a.id}`,
      type: 'alert',
      ref_id: a.id,
      title: a.device_name || a.sensor_name || a.actuator_name || 'Pump Alert',
      message: a.message,
      severity: a.severity,
      status: a.is_resolved ? 'resolved' : 'ongoing',
      created_at: a.created_at,
    }));

    const orderItems = ordersRes.rows.map((o) => ({
      id: `order-${o.id}`,
      type: 'order',
      ref_id: o.id,
      title: `Order #${o.id}`,
      message: `Status updated to ${o.status} · ₹${o.total}`,
      severity: null,
      status: o.status,
      created_at: o.updated_at,
    }));

    const runItems = runsRes.rows.map((r) => ({
      id: `run-${r.id}`,
      type: 'irrigation',
      ref_id: r.id,
      title: r.plan_name || 'Irrigation Plan',
      message: r.status === 'completed' ? 'Completed successfully' : 'Stopped before completion',
      severity: null,
      status: r.status,
      created_at: r.completed_at,
    }));

    const merged = [...alertItems, ...orderItems, ...runItems].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ success: true, data: merged.slice(0, 150) });
  } catch (err) {
    console.error('[Notifications GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

module.exports = router;
