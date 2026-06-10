const db = require('../config/database');
const { connectMqtt, publishCommand } = require('../config/mqtt');
const { emitToOrg } = require('../config/socket');

const AUTOMATION_COOLDOWN_MS = 60 * 1000; // don't re-fire the same rule within 60s

function conditionMet(value, condition, threshold) {
  switch (condition) {
    case '<':  return value < threshold;
    case '>':  return value > threshold;
    case '<=': return value <= threshold;
    case '>=': return value >= threshold;
    case '==': return Number(value) === Number(threshold);
    default:   return false;
  }
}

// Updates sensor value, records history, raises/resolves threshold alerts,
// and evaluates automation rules tied to this sensor.
async function handleSensorMessage(device, orgId, payload) {
  const sensors = await db.query(`SELECT * FROM sensors WHERE device_id = $1`, [device.id]);

  for (const sensor of sensors.rows) {
    if (!(sensor.channel in payload)) continue;
    const value = Number(payload[sensor.channel]);
    if (Number.isNaN(value)) continue;

    await db.query(
      `UPDATE sensors SET current_value = $1, last_reading_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [value, sensor.id]
    );
    await db.query(
      `INSERT INTO sensor_readings (organization_id, sensor_id, value) VALUES ($1, $2, $3)`,
      [orgId, sensor.id, value]
    );

    await checkThresholdAlert(sensor, value, device, orgId);
    await evaluateAutomationRules(sensor, value, orgId);

    emitToOrg(orgId, 'sensor-data', { ...sensor, current_value: value, last_reading_at: new Date() });
  }
}

async function checkThresholdAlert(sensor, value, device, orgId) {
  let breach = null;
  if (sensor.max_threshold !== null && value > sensor.max_threshold) breach = 'above';
  else if (sensor.min_threshold !== null && value < sensor.min_threshold) breach = 'below';

  const existing = await db.query(
    `SELECT id FROM alerts WHERE sensor_id = $1 AND alert_type = 'threshold' AND is_resolved = false`,
    [sensor.id]
  );

  if (breach) {
    if (!existing.rows.length) {
      const message = `${sensor.name} is ${breach} threshold (${value}${sensor.unit || ''})`;
      const alert = await db.query(
        `INSERT INTO alerts (organization_id, device_id, sensor_id, alert_type, severity, message)
         VALUES ($1, $2, $3, 'threshold', 'warning', $4) RETURNING *`,
        [orgId, device.id, sensor.id, message]
      );
      emitToOrg(orgId, 'alert', alert.rows[0]);
    }
  } else if (existing.rows.length) {
    await db.query(`UPDATE alerts SET is_resolved = true, resolved_at = NOW() WHERE id = $1`, [existing.rows[0].id]);
  }
}

async function evaluateAutomationRules(sensor, value, orgId) {
  const rules = await db.query(
    `SELECT r.*, a.relay_channel, a.id AS actuator_id, a.name AS actuator_name, d.api_key
     FROM automation_rules r
     JOIN actuators a ON a.id = r.action_actuator_id
     JOIN devices d ON d.id = a.device_id
     WHERE r.trigger_sensor_id = $1 AND r.is_active = true`,
    [sensor.id]
  );

  for (const rule of rules.rows) {
    if (!conditionMet(value, rule.trigger_condition, Number(rule.trigger_value))) continue;
    if (rule.last_triggered_at && Date.now() - new Date(rule.last_triggered_at).getTime() < AUTOMATION_COOLDOWN_MS) continue;

    publishCommand(orgId, rule.api_key, {
      action: rule.action_state === 'on' ? 'turn_on' : 'turn_off',
      actuator_id: rule.actuator_id,
      actuator_name: rule.actuator_name,
      relay_channel: rule.relay_channel,
      state: rule.action_state,
      duration: (rule.action_duration_minutes || 0) * 60
    });

    const updated = await db.query(
      `UPDATE actuators SET
         current_state      = $1,
         last_turned_on_at  = CASE WHEN $1 = 'on'  THEN NOW() ELSE last_turned_on_at  END,
         last_turned_off_at = CASE WHEN $1 = 'off' THEN NOW() ELSE last_turned_off_at END,
         updated_at         = NOW()
       WHERE id = $2 RETURNING *`,
      [rule.action_state, rule.actuator_id]
    );

    await db.query(
      `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by, triggered_by_id, duration_minutes)
       VALUES ($1, $2, $3, 'automation', $4, $5)`,
      [orgId, rule.actuator_id, rule.action_state, rule.id, rule.action_duration_minutes || null]
    );

    await db.query(
      `UPDATE automation_rules SET trigger_count = trigger_count + 1, last_triggered_at = NOW() WHERE id = $1`,
      [rule.id]
    );

    emitToOrg(orgId, 'actuator-status', updated.rows[0]);
    emitToOrg(orgId, 'automation-triggered', { rule_id: rule.id, rule_name: rule.name, actuator_id: rule.actuator_id, state: rule.action_state });
  }
}

// Updates device online/offline status, last_seen, and syncs reported relay states.
async function handleStatusMessage(device, orgId, payload) {
  const newStatus = payload.status === 'online' ? 'online' : 'offline';

  await db.query(
    `UPDATE devices SET
       status           = $1,
       last_seen_at     = NOW(),
       ip_address       = COALESCE($2, ip_address),
       firmware_version = COALESCE($3, firmware_version),
       updated_at       = NOW()
     WHERE id = $4`,
    [newStatus, payload.ip || null, payload.firmware_version || null, device.id]
  );

  if (newStatus !== device.status) {
    await db.query(
      `INSERT INTO device_logs (organization_id, device_id, event_type, payload) VALUES ($1, $2, $3, $4)`,
      [orgId, device.id, newStatus, JSON.stringify(payload)]
    );

    if (newStatus === 'offline') {
      const alert = await db.query(
        `INSERT INTO alerts (organization_id, device_id, alert_type, severity, message)
         VALUES ($1, $2, 'offline', 'critical', $3) RETURNING *`,
        [orgId, device.id, `Device "${device.name}" went offline`]
      );
      emitToOrg(orgId, 'alert', alert.rows[0]);
    } else {
      await db.query(
        `UPDATE alerts SET is_resolved = true, resolved_at = NOW()
         WHERE device_id = $1 AND alert_type = 'offline' AND is_resolved = false`,
        [device.id]
      );
    }
  }

  // Optional: device reports actual relay states on reconnect, e.g. { relay_states: { "1": "on", "2": "off" } }
  if (payload.relay_states && typeof payload.relay_states === 'object') {
    for (const [channel, state] of Object.entries(payload.relay_states)) {
      if (!['on', 'off'].includes(state)) continue;
      await db.query(
        `UPDATE actuators SET current_state = $1, updated_at = NOW()
         WHERE device_id = $2 AND relay_channel = $3`,
        [state, device.id, parseInt(channel, 10)]
      );
    }
  }

  emitToOrg(orgId, 'device-status', { device_id: device.id, status: newStatus, last_seen_at: new Date() });
}

function startMqttService() {
  const client = connectMqtt();

  client.on('connect', () => {
    client.subscribe('farm/+/+/sensors');
    client.subscribe('farm/+/+/status');
  });

  client.on('message', async (topic, messageBuf) => {
    const parts = topic.split('/'); // farm / {org_id} / {api_key} / sensors|status
    if (parts.length !== 4 || parts[0] !== 'farm') return;
    const [, orgIdStr, apiKey, type] = parts;
    const orgId = parseInt(orgIdStr, 10);
    if (!['sensors', 'status'].includes(type) || Number.isNaN(orgId)) return;

    let payload;
    try {
      payload = JSON.parse(messageBuf.toString());
    } catch (err) {
      console.error(`[MQTT] Invalid JSON on ${topic}`);
      return;
    }

    try {
      // Cross-check api_key against the org_id in the topic to prevent spoofing
      const deviceResult = await db.query(
        `SELECT * FROM devices WHERE api_key = $1 AND organization_id = $2`,
        [apiKey, orgId]
      );
      if (!deviceResult.rows.length) {
        console.warn(`[MQTT] Rejected message — unknown device/org: org=${orgId} key=${apiKey}`);
        return;
      }
      const device = deviceResult.rows[0];

      if (type === 'sensors') {
        await handleSensorMessage(device, orgId, payload);
      } else {
        await handleStatusMessage(device, orgId, payload);
      }
    } catch (err) {
      console.error('[MQTT] Error handling message:', err.message);
    }
  });

  return client;
}

module.exports = { startMqttService };
