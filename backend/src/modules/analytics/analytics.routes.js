const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

const RANGE_CONFIG = {
  '24h': { ms: 24 * 60 * 60 * 1000, buckets: 24, bucketMs: 60 * 60 * 1000 },
  '10d': { ms: 10 * 24 * 60 * 60 * 1000, buckets: 10, bucketMs: 24 * 60 * 60 * 1000 },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // pump sites are in India

// Returns the UTC instant corresponding to local midnight (IST) for the IST calendar day containing `date`.
function istDayStart(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

function formatISTDate(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function formatISTDateLabel(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatISTTime(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Effective flow rate (L/min): a directly entered nameplate value wins, otherwise
// derive it from the pipe's cross-sectional area and the water velocity.
function getEffectiveFlowRateLpm(actuator) {
  if (actuator.flow_rate_lpm != null) return Number(actuator.flow_rate_lpm);
  if (actuator.pipe_diameter_mm != null && actuator.flow_velocity_ms != null) {
    const radiusM = Number(actuator.pipe_diameter_mm) / 2000; // mm -> m, then halve for radius
    const areaM2 = Math.PI * radiusM * radiusM;
    return areaM2 * Number(actuator.flow_velocity_ms) * 60000; // m^3/s -> L/min
  }
  return null;
}

// Turn a chronological list of {action, created_at} logs into ON intervals,
// clamped to [rangeStart, rangeEnd]. An actuator still ON at rangeEnd stays open until rangeEnd.
function computeRuntimeIntervals(logs, rangeStart, rangeEnd) {
  const intervals = [];
  let onSince = null;

  for (const log of logs) {
    const ts = log.created_at;
    if (log.action === 'on') {
      if (onSince === null) onSince = ts;
    } else if (log.action === 'off') {
      if (onSince !== null) {
        intervals.push({ start: onSince, end: ts });
        onSince = null;
      }
    }
  }
  if (onSince !== null) {
    intervals.push({ start: onSince, end: rangeEnd });
  }

  return intervals
    .map(({ start, end }) => ({
      start: start < rangeStart ? rangeStart : start,
      end: end > rangeEnd ? rangeEnd : end,
    }))
    .filter(({ start, end }) => end > start);
}

function intervalMinutes(intervals) {
  return intervals.reduce((sum, { start, end }) => sum + (end - start) / 60000, 0);
}

function overlapMinutes(intervals, bucketStart, bucketEnd) {
  let total = 0;
  for (const { start, end } of intervals) {
    const s = start < bucketStart ? bucketStart : start;
    const e = end > bucketEnd ? bucketEnd : end;
    if (e > s) total += (e - s) / 60000;
  }
  return total;
}

function computeMetrics(actuator, runtimeMinutes, electricityRate) {
  const effectiveLpm = getEffectiveFlowRateLpm(actuator);
  const waterLiters = effectiveLpm != null ? effectiveLpm * runtimeMinutes : 0;
  const powerKw = actuator.power_rating_watts != null ? Number(actuator.power_rating_watts) / 1000 : 0;
  const electricityKwh = powerKw * (runtimeMinutes / 60);
  const cost = electricityKwh * electricityRate;
  return {
    runtimeMinutes,
    waterLiters,
    electricityKwh,
    cost,
    specsConfigured: effectiveLpm != null || powerKw > 0,
  };
}

function formatBucketLabel(date, range) {
  if (range === '24h') {
    const hours = date.getHours();
    if (hours === 0) return '12A';
    if (hours === 12) return '12P';
    return hours > 12 ? String(hours - 12) : String(hours);
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function fetchActuatorIntervals(actuatorId, rangeStart, rangeEnd) {
  const logsResult = await db.query(
    `SELECT action, created_at FROM actuator_logs
     WHERE actuator_id = $1 AND created_at <= $2
     ORDER BY created_at DESC LIMIT 500`,
    [actuatorId, rangeEnd]
  );
  const logs = logsResult.rows
    .slice()
    .reverse()
    .map((l) => ({ action: l.action, created_at: new Date(l.created_at) }));
  return computeRuntimeIntervals(logs, rangeStart, rangeEnd);
}

async function fetchActuators(req) {
  const params = [req.user.organization_id];
  let where = 'a.organization_id = $1';
  if (req.query.farm_id) {
    params.push(req.query.farm_id);
    where += ` AND a.farm_id = $${params.length}`;
  }
  const result = await db.query(
    `SELECT a.*, f.name AS farm_name FROM actuators a
     LEFT JOIN farms f ON f.id = a.farm_id
     WHERE ${where}
     ORDER BY a.id`,
    params
  );
  return result.rows;
}

async function fetchElectricityRate(organizationId) {
  const result = await db.query(`SELECT electricity_rate_per_kwh FROM organizations WHERE id = $1`, [organizationId]);
  return Number(result.rows[0]?.electricity_rate_per_kwh ?? 8);
}

// GET /api/v1/analytics/overview?range=24h|10d&farm_id=
router.get('/overview', async (req, res) => {
  try {
    const range = req.query.range === '10d' ? '10d' : '24h';
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - RANGE_CONFIG[range].ms);

    const [actuators, electricityRate] = await Promise.all([
      fetchActuators(req),
      fetchElectricityRate(req.user.organization_id),
    ]);

    const totals = { runtime_minutes: 0, water_liters: 0, electricity_kwh: 0, cost: 0, currently_running: 0 };
    const actuatorBreakdown = [];

    for (const act of actuators) {
      const intervals = await fetchActuatorIntervals(act.id, rangeStart, rangeEnd);
      const runtimeMinutes = intervalMinutes(intervals);
      const metrics = computeMetrics(act, runtimeMinutes, electricityRate);

      totals.runtime_minutes += metrics.runtimeMinutes;
      totals.water_liters += metrics.waterLiters;
      totals.electricity_kwh += metrics.electricityKwh;
      totals.cost += metrics.cost;
      if (act.current_state === 'on') totals.currently_running += 1;

      actuatorBreakdown.push({
        id: act.id,
        name: act.name,
        farm_name: act.farm_name,
        actuator_type: act.actuator_type,
        current_state: act.current_state,
        runtime_minutes: round2(metrics.runtimeMinutes),
        water_liters: round2(metrics.waterLiters),
        electricity_kwh: round2(metrics.electricityKwh),
        cost: round2(metrics.cost),
        specs_configured: metrics.specsConfigured,
      });
    }

    res.json({
      success: true,
      data: {
        range,
        electricity_rate_per_kwh: electricityRate,
        totals: {
          runtime_minutes: round2(totals.runtime_minutes),
          water_liters: round2(totals.water_liters),
          electricity_kwh: round2(totals.electricity_kwh),
          cost: round2(totals.cost),
          currently_running: totals.currently_running,
        },
        actuators: actuatorBreakdown,
      },
    });
  } catch (err) {
    console.error('[Analytics/overview]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics overview' });
  }
});

// GET /api/v1/analytics/series?range=24h|10d&farm_id=
router.get('/series', async (req, res) => {
  try {
    const range = req.query.range === '10d' ? '10d' : '24h';
    const { ms, buckets, bucketMs } = RANGE_CONFIG[range];
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - ms);

    const [actuators, electricityRate] = await Promise.all([
      fetchActuators(req),
      fetchElectricityRate(req.user.organization_id),
    ]);

    const actuatorIntervals = [];
    for (const act of actuators) {
      const intervals = await fetchActuatorIntervals(act.id, rangeStart, rangeEnd);
      actuatorIntervals.push({ act, intervals });
    }

    const bucketsOut = [];
    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(rangeStart.getTime() + i * bucketMs);
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);

      let runtimeMinutes = 0;
      let waterLiters = 0;
      let electricityKwh = 0;

      for (const { act, intervals } of actuatorIntervals) {
        const minutes = overlapMinutes(intervals, bucketStart, bucketEnd);
        if (minutes <= 0) continue;
        runtimeMinutes += minutes;
        const effectiveLpm = getEffectiveFlowRateLpm(act);
        if (effectiveLpm != null) waterLiters += effectiveLpm * minutes;
        const powerKw = act.power_rating_watts != null ? Number(act.power_rating_watts) / 1000 : 0;
        electricityKwh += powerKw * (minutes / 60);
      }

      bucketsOut.push({
        label: formatBucketLabel(bucketStart, range),
        start: bucketStart.toISOString(),
        end: bucketEnd.toISOString(),
        runtime_minutes: round2(runtimeMinutes),
        water_liters: round2(waterLiters),
        electricity_kwh: round2(electricityKwh),
        cost: round2(electricityKwh * electricityRate),
      });
    }

    res.json({ success: true, data: { range, electricity_rate_per_kwh: electricityRate, buckets: bucketsOut } });
  } catch (err) {
    console.error('[Analytics/series]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics series' });
  }
});

// GET /api/v1/analytics/daily-runtime?days=10&farm_id=
// Day-by-day (IST calendar days) breakdown of how many hours each motor was ON,
// including the on/off session times for that day.
router.get('/daily-runtime', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 10, 1), 31);
    const rangeEnd = new Date();
    const todayStart = istDayStart(rangeEnd);
    const rangeStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

    const actuators = await fetchActuators(req);

    const actuatorIntervals = [];
    for (const act of actuators) {
      const intervals = await fetchActuatorIntervals(act.id, rangeStart, rangeEnd);
      actuatorIntervals.push({ act, intervals });
    }

    const daysOut = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * DAY_MS);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);

      let totalMinutes = 0;
      let waterLiters = 0;
      let electricityKwh = 0;
      const actuatorsOut = [];
      for (const { act, intervals } of actuatorIntervals) {
        const sessions = [];
        let minutes = 0;
        for (const { start, end } of intervals) {
          const s = start < dayStart ? dayStart : start;
          const e = end > dayEnd ? dayEnd : end;
          if (e > s) {
            minutes += (e - s) / 60000;
            sessions.push({ start: formatISTTime(s), end: formatISTTime(e) });
          }
        }
        if (minutes > 0) {
          totalMinutes += minutes;
          const effectiveLpm = getEffectiveFlowRateLpm(act);
          if (effectiveLpm != null) waterLiters += effectiveLpm * minutes;
          const powerKw = act.power_rating_watts != null ? Number(act.power_rating_watts) / 1000 : 0;
          electricityKwh += powerKw * (minutes / 60);
          actuatorsOut.push({ id: act.id, name: act.name, hours: round2(minutes / 60), sessions });
        }
      }

      daysOut.push({
        date: formatISTDate(dayStart),
        label: formatISTDateLabel(dayStart),
        total_hours: round2(totalMinutes / 60),
        water_liters: round2(waterLiters),
        electricity_kwh: round2(electricityKwh),
        actuators: actuatorsOut,
      });
    }

    res.json({ success: true, data: { days: daysOut } });
  } catch (err) {
    console.error('[Analytics/daily-runtime]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch daily runtime' });
  }
});

module.exports = router;
