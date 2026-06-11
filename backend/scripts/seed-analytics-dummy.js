// One-off script to seed realistic 10-day actuator_logs history for the Analytics page.
// Usage: node scripts/seed-analytics-dummy.js
require('dotenv').config();
const db = require('../src/config/database');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function istDayStart(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

async function main() {
  const orgId = 1;
  const farmId = 1;

  // Pump specs for the existing "Motor" actuator
  await db.query(
    `UPDATE actuators SET farm_id = $1, pipe_diameter_mm = $2, flow_velocity_ms = $3, power_rating_watts = $4
     WHERE id = 1`,
    [farmId, 100, 1.2, 3000]
  );

  // Second pump for a more realistic multi-pump dashboard
  let pump2Id;
  const existing = await db.query(
    `SELECT id FROM actuators WHERE organization_id = $1 AND device_id = 1 AND relay_channel = 1`,
    [orgId]
  );
  if (existing.rows.length) {
    pump2Id = existing.rows[0].id;
    await db.query(
      `UPDATE actuators SET farm_id = $1, actuator_type = 'pump', flow_rate_lpm = $2, pipe_diameter_mm = $3, power_rating_watts = $4
       WHERE id = $5`,
      [farmId, 250, 75, 1500, pump2Id]
    );
  } else {
    const result = await db.query(
      `INSERT INTO actuators (organization_id, device_id, farm_id, name, actuator_type, relay_channel, flow_rate_lpm, pipe_diameter_mm, power_rating_watts)
       VALUES ($1, 1, $2, 'Borewell Pump', 'pump', 1, $3, $4, $5) RETURNING id`,
      [orgId, farmId, 250, 75, 1500]
    );
    pump2Id = result.rows[0].id;
  }

  // Replace any existing logs with a clean, realistic 10-day history
  await db.query(`DELETE FROM actuator_logs WHERE actuator_id = ANY($1)`, [[1, pump2Id]]);

  const now = new Date();
  const todayStart = istDayStart(now);

  const sessionTemplates = {
    1: [
      (d) => ({ startMin: 6 * 60 + (d % 3) * 5, durationMin: 90 + (d % 4) * 15 }),
      (d) => ({ startMin: 17 * 60 + 30 + (d % 3) * 10, durationMin: 60 + (d % 3) * 20 }),
    ],
    [pump2Id]: [
      (d) => ({ startMin: 5 * 60 + 30 + (d % 4) * 5, durationMin: 75 + (d % 3) * 15 }),
      (d) => ({ startMin: 13 * 60 + (d % 2) * 15, durationMin: 60 + (d % 4) * 10 }),
    ],
  };

  const logs = [];
  for (const [actuatorIdStr, templates] of Object.entries(sessionTemplates)) {
    const actuatorId = Number(actuatorIdStr);
    for (let d = 9; d >= 0; d--) {
      const dayStart = new Date(todayStart.getTime() - d * DAY_MS);
      for (const template of templates) {
        const { startMin, durationMin } = template(d);
        const start = new Date(dayStart.getTime() + startMin * 60000);
        const end = new Date(start.getTime() + durationMin * 60000);
        if (start > now || end > now) continue; // skip sessions that haven't happened yet
        logs.push({ actuatorId, action: 'on', created_at: start, duration_minutes: durationMin });
        logs.push({ actuatorId, action: 'off', created_at: end, duration_minutes: null });
      }
    }
  }

  for (const log of logs) {
    await db.query(
      `INSERT INTO actuator_logs (organization_id, actuator_id, action, triggered_by, duration_minutes, created_at)
       VALUES ($1, $2, $3, 'schedule', $4, $5)`,
      [orgId, log.actuatorId, log.action, log.duration_minutes, log.created_at]
    );
  }

  // Sync each actuator's current_state with its latest log
  for (const actuatorId of [1, pump2Id]) {
    const last = await db.query(
      `SELECT action, created_at FROM actuator_logs WHERE actuator_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [actuatorId]
    );
    if (last.rows.length) {
      const { action, created_at } = last.rows[0];
      if (action === 'on') {
        await db.query(`UPDATE actuators SET current_state = 'on', last_turned_on_at = $1 WHERE id = $2`, [created_at, actuatorId]);
      } else {
        await db.query(`UPDATE actuators SET current_state = 'off', last_turned_off_at = $1 WHERE id = $2`, [created_at, actuatorId]);
      }
    }
  }

  console.log(`Seeded ${logs.length} actuator_logs rows for actuators 1 and ${pump2Id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
