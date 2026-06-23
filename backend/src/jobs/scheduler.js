const cron = require('node-cron');
const db = require('../config/database');
const { publishCommand } = require('../config/mqtt');
const { emitToOrg } = require('../config/socket');

const OFFLINE_THRESHOLD = '2 minutes';

// Runs scheduled actuator ON commands whose start_time matches the current minute.
// NOTE: schedule.start_time is compared against the DB server's clock (UTC by
// default on Neon) — pick start_time accordingly until per-farm timezones are added.
async function runSchedules() {
  const due = await db.query(
    `SELECT sch.*, a.relay_channel, a.id AS actuator_id, a.name AS actuator_name, d.api_key
     FROM schedules sch
     JOIN actuators a ON a.id = sch.actuator_id
     JOIN devices d ON d.id = a.device_id
     WHERE sch.is_active = true
       AND a.status = 'active'
       AND EXTRACT(DOW FROM NOW())::int = ANY(sch.days_of_week)
       AND date_trunc('minute', sch.start_time) = date_trunc('minute', NOW()::time)
       AND (sch.last_run_at IS NULL OR sch.last_run_at < date_trunc('minute', NOW()))`
  );

  for (const sch of due.rows) {
    publishCommand(sch.organization_id, sch.api_key, {
      action: 'turn_on',
      actuator_id: sch.actuator_id,
      actuator_name: sch.actuator_name,
      relay_channel: sch.relay_channel,
      state: 'on',
      duration: sch.duration_minutes * 60
    });

    const updated = await db.query(
      `UPDATE actuators SET current_state = 'on', last_turned_on_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [sch.actuator_id]
    );

    await db.query(
      `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by, triggered_by_id, duration_minutes)
       VALUES ($1, $2, 'on', 'schedule', $3, $4)`,
      [sch.organization_id, sch.actuator_id, sch.id, sch.duration_minutes]
    );

    await db.query(`UPDATE schedules SET last_run_at = NOW() WHERE id = $1`, [sch.id]);

    emitToOrg(sch.organization_id, 'actuator-status', updated.rows[0]);
  }
}

// Force-off any actuator that has been running past its configured max_runtime_minutes —
// a backstop in case the ESP32 misses or fails to honor the duration sent with the command.
async function enforceSafetyCutoffs() {
  const overrun = await db.query(
    `SELECT a.*, d.api_key FROM actuators a
     JOIN devices d ON d.id = a.device_id
     WHERE a.current_state = 'on'
       AND a.max_runtime_minutes IS NOT NULL
       AND a.last_turned_on_at IS NOT NULL
       AND a.last_turned_on_at < NOW() - (a.max_runtime_minutes || ' minutes')::interval`
  );

  for (const act of overrun.rows) {
    publishCommand(act.organization_id, act.api_key, {
      action: 'turn_off',
      actuator_id: act.id,
      actuator_name: act.name,
      relay_channel: act.relay_channel,
      state: 'off',
      duration: 0
    });

    const updated = await db.query(
      `UPDATE actuators SET current_state = 'off', last_turned_off_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [act.id]
    );

    await db.query(
      `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by)
       VALUES ($1, $2, 'off', 'safety_cutoff')`,
      [act.organization_id, act.id]
    );

    const alert = await db.query(
      `INSERT INTO alerts (organization_id, device_id, actuator_id, alert_type, severity, message, message_template, message_params)
       VALUES ($1, $2, $3, 'safety_cutoff', 'warning', $4, 'safety_cutoff', $5) RETURNING *`,
      [
        act.organization_id, act.device_id, act.id,
        `"${act.name}" exceeded max runtime (${act.max_runtime_minutes} min) and was switched off`,
        JSON.stringify({ name: act.name, minutes: act.max_runtime_minutes }),
      ]
    );

    emitToOrg(act.organization_id, 'actuator-status', updated.rows[0]);
    emitToOrg(act.organization_id, 'alert', alert.rows[0]);
  }
}

// Marks devices offline if no MQTT status message has been received recently —
// catches silent disconnects where the broker's LWT didn't fire. Any actuator left
// "on" on a device that just went silent is force-marked off in our records too,
// since we have no telemetry confirming it's still running and otherwise it would
// count as running/consuming water+power forever in live status and analytics.
async function detectOfflineDevices() {
  const stale = await db.query(
    `SELECT * FROM devices
     WHERE status = 'online' AND last_seen_at < NOW() - INTERVAL '${OFFLINE_THRESHOLD}'`
  );

  for (const device of stale.rows) {
    await db.query(`UPDATE devices SET status = 'offline', updated_at = NOW() WHERE id = $1`, [device.id]);

    await db.query(
      `INSERT INTO device_logs (organization_id, device_id, event_type) VALUES ($1, $2, 'offline')`,
      [device.organization_id, device.id]
    );

    const alert = await db.query(
      `INSERT INTO alerts (organization_id, device_id, alert_type, severity, message, message_template, message_params)
       VALUES ($1, $2, 'offline', 'critical', $3, 'device_offline_stopped', $4) RETURNING *`,
      [device.organization_id, device.id, `Device "${device.name}" stopped responding`, JSON.stringify({ name: device.name })]
    );

    emitToOrg(device.organization_id, 'device-status', { device_id: device.id, status: 'offline' });
    emitToOrg(device.organization_id, 'alert', alert.rows[0]);

    const strandedOn = await db.query(
      `UPDATE actuators SET current_state = 'off', last_turned_off_at = $2, updated_at = NOW()
       WHERE device_id = $1 AND current_state = 'on'
       RETURNING *`,
      [device.id, device.last_seen_at]
    );

    for (const act of strandedOn.rows) {
      await db.query(
        `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by, created_at)
         VALUES ($1, $2, 'off', 'device_offline', $3)`,
        [act.organization_id, act.id, device.last_seen_at]
      );
      emitToOrg(act.organization_id, 'actuator-status', act);
    }
  }
}

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      await runSchedules();
      await enforceSafetyCutoffs();
      await detectOfflineDevices();
    } catch (err) {
      console.error('[Scheduler]', err.message);
    }
  });
  console.log('[Scheduler] Cron job started (runs every minute)');
}

module.exports = { startScheduler };
