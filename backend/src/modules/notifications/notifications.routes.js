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
      `SELECT a.id, a.alert_type, a.severity, a.message, a.message_template, a.message_params,
              a.is_resolved, a.created_at,
              d.name AS device_name, s.name AS sensor_name, s.sensor_type, act.name AS actuator_name
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

    const powerRes = await db.query(
      `SELECT pe.id, pe.event_type, pe.created_at, d.name AS device_name
       FROM power_events pe
       LEFT JOIN devices d ON d.id = pe.device_id
       WHERE pe.organization_id = $1
       ORDER BY pe.created_at DESC LIMIT 50`,
      [orgId]
    );

    // title/message stay in English for the web dashboard (unchanged shape);
    // title_key/message_key + their _params let the mobile app render the
    // same content in Hindi/Marathi without re-deriving it from English text.
    const alertItems = alertsRes.rows.map((a) => ({
      id: `alert-${a.id}`,
      type: 'alert',
      ref_id: a.id,
      // alert_type ('threshold' | 'offline' | 'safety_cutoff') + sensor_type
      // ('current' marks the anti-theft CT clamp) let the app pick a distinct
      // icon/color per cause rather than one generic alert icon for all of them.
      alert_type: a.alert_type,
      sensor_type: a.sensor_type,
      title: a.device_name || a.sensor_name || a.actuator_name || 'Pump Alert',
      title_key: a.device_name || a.sensor_name || a.actuator_name ? null : 'notif_pump_alert_default',
      message: a.message,
      message_key: a.message_template,
      message_params: a.message_params,
      severity: a.severity,
      status: a.is_resolved ? 'resolved' : 'ongoing',
      created_at: a.created_at,
    }));

    const orderItems = ordersRes.rows.map((o) => ({
      id: `order-${o.id}`,
      type: 'order',
      ref_id: o.id,
      title: `Order #${o.id}`,
      title_key: 'notif_order_title',
      title_params: { id: o.id },
      message: `Status updated to ${o.status} · ₹${o.total}`,
      message_key: 'notif_order_status_message',
      message_params: { status: o.status, total: o.total },
      severity: null,
      status: o.status,
      created_at: o.updated_at,
    }));

    const runItems = runsRes.rows.map((r) => ({
      id: `run-${r.id}`,
      type: 'irrigation',
      ref_id: r.id,
      title: r.plan_name || 'Irrigation Plan',
      title_key: r.plan_name ? null : 'notif_irrigation_default_title',
      message: r.status === 'completed' ? 'Completed successfully' : 'Stopped before completion',
      message_key: r.status === 'completed' ? 'notif_run_completed' : 'notif_run_aborted',
      severity: null,
      status: r.status,
      created_at: r.completed_at,
    }));

    const powerItems = powerRes.rows.map((p) => ({
      id: `power-${p.id}`,
      type: 'power',
      ref_id: p.id,
      title: p.device_name || 'Device',
      title_key: p.device_name ? null : 'notif_pump_alert_default',
      message: p.event_type === 'power_on' ? 'Mains power restored' : 'Mains power cut',
      message_key: p.event_type === 'power_on' ? 'notif_power_restored' : 'notif_power_cut',
      severity: null,
      status: p.event_type,
      created_at: p.created_at,
    }));

    const merged = [...alertItems, ...orderItems, ...runItems, ...powerItems].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ success: true, data: merged.slice(0, 150) });
  } catch (err) {
    console.error('[Notifications GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

module.exports = router;
