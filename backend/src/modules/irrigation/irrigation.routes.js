const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// ─── In-memory run registry ────────────────────────────────────────────────────
// Maps runId → { cancelFn }  so we can abort a running plan
const activeRuns = new Map();

async function setActuatorState(actuatorId, state) {
  await db.query(
    `UPDATE actuators SET current_state = $1, updated_at = NOW() WHERE id = $2`,
    [state, actuatorId]
  );
}

async function executePlan(runId, plan, steps, isSimulation) {
  // Simulation: 3 real seconds per plan-minute → a 15-min zone = 45 real seconds
  const MS_PER_MINUTE = isSimulation ? 3000 : 60000;

  try {
    // Motor ON
    if (plan.motor_actuator_id && !isSimulation) {
      await setActuatorState(plan.motor_actuator_id, 'on');
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!activeRuns.has(runId)) break; // aborted externally

      // Mark step running
      await db.query(
        `UPDATE irrigation_runs SET current_step = $1 WHERE id = $2`,
        [i + 1, runId]
      );
      await db.query(
        `UPDATE irrigation_run_logs
            SET started_at = NOW(), status = 'running'
          WHERE run_id = $1 AND step_order = $2`,
        [runId, step.step_order]
      );

      // Open zone valve
      if (step.valve_actuator_id && !isSimulation) {
        await setActuatorState(step.valve_actuator_id, 'on');
      }

      // Wait for duration (cancellable)
      const cancelled = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), step.duration_minutes * MS_PER_MINUTE);
        activeRuns.set(runId, {
          cancel: () => { clearTimeout(timeout); resolve(true); },
        });
      });

      // Close zone valve
      if (step.valve_actuator_id && !isSimulation) {
        await setActuatorState(step.valve_actuator_id, 'off');
      }

      await db.query(
        `UPDATE irrigation_run_logs
            SET completed_at = NOW(), status = $1
          WHERE run_id = $2 AND step_order = $3`,
        [cancelled ? 'aborted' : 'completed', runId, step.step_order]
      );

      if (cancelled) {
        await db.query(
          `UPDATE irrigation_runs SET status = 'aborted', completed_at = NOW() WHERE id = $1`,
          [runId]
        );
        // Close all remaining valves just in case
        for (let j = i + 1; j < steps.length; j++) {
          if (steps[j].valve_actuator_id && !isSimulation) {
            await setActuatorState(steps[j].valve_actuator_id, 'off').catch(() => {});
          }
        }
        activeRuns.delete(runId);
        return;
      }
    }

    // Motor OFF
    if (plan.motor_actuator_id && !isSimulation) {
      await setActuatorState(plan.motor_actuator_id, 'off');
    }

    await db.query(
      `UPDATE irrigation_runs
          SET status = 'completed', completed_at = NOW(), current_step = total_steps
        WHERE id = $1`,
      [runId]
    );

  } catch (err) {
    console.error('[IrrigationRun]', err.message);
    await db.query(
      `UPDATE irrigation_runs SET status = 'aborted', completed_at = NOW() WHERE id = $1`,
      [runId]
    ).catch(() => {});
  } finally {
    activeRuns.delete(runId);
  }
}

// ─── Plans CRUD ────────────────────────────────────────────────────────────────

// GET /irrigation-plans?farm_id= — list plans with their steps
router.get('/plans', async (req, res) => {
  try {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ success: false, message: 'farm_id required' });

    const plansRes = await db.query(
      `SELECT p.*,
              a.name AS motor_name,
              a.current_state AS motor_state
       FROM irrigation_plans p
       LEFT JOIN actuators a ON a.id = p.motor_actuator_id
       WHERE p.farm_id = $1 AND p.organization_id = $2
       ORDER BY p.created_at DESC`,
      [farm_id, req.user.organization_id]
    );

    const plans = plansRes.rows;
    if (!plans.length) return res.json({ success: true, data: [] });

    const planIds = plans.map((p) => p.id);
    const stepsRes = await db.query(
      `SELECT s.*, z.valve_actuator_id, av.name AS valve_name, av.current_state AS valve_state
       FROM irrigation_plan_steps s
       LEFT JOIN zones z ON z.id = s.zone_id
       LEFT JOIN actuators av ON av.id = z.valve_actuator_id
       WHERE s.plan_id = ANY($1)
       ORDER BY s.plan_id, s.step_order`,
      [planIds]
    );

    const stepsByPlan = {};
    stepsRes.rows.forEach((s) => {
      if (!stepsByPlan[s.plan_id]) stepsByPlan[s.plan_id] = [];
      stepsByPlan[s.plan_id].push(s);
    });

    res.json({ success: true, data: plans.map((p) => ({ ...p, steps: stepsByPlan[p.id] || [] })) });
  } catch (err) {
    console.error('[IrrigationPlans GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch irrigation plans' });
  }
});

// POST /irrigation-plans — create plan + steps
router.post('/plans', async (req, res) => {
  const client = await db.connect();
  try {
    const { farm_id, name, motor_actuator_id, steps } = req.body;
    if (!farm_id || !name || !Array.isArray(steps) || !steps.length) {
      return res.status(400).json({ success: false, message: 'farm_id, name, and steps[] required' });
    }

    await client.query('BEGIN');

    const planRes = await client.query(
      `INSERT INTO irrigation_plans (farm_id, organization_id, name, motor_actuator_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [farm_id, req.user.organization_id, name.trim(), motor_actuator_id || null]
    );
    const plan = planRes.rows[0];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Fetch zone name snapshot
      const zoneRes = step.zone_id
        ? await client.query('SELECT name FROM zones WHERE id = $1', [step.zone_id])
        : { rows: [] };
      const zoneName = zoneRes.rows[0]?.name || step.zone_name || null;

      await client.query(
        `INSERT INTO irrigation_plan_steps (plan_id, step_order, zone_id, zone_name, duration_minutes)
         VALUES ($1, $2, $3, $4, $5)`,
        [plan.id, i + 1, step.zone_id || null, zoneName, step.duration_minutes || 15]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[IrrigationPlans POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create plan' });
  } finally {
    client.release();
  }
});

// PUT /irrigation-plans/:id — update plan + replace steps
router.put('/plans/:id', async (req, res) => {
  const client = await db.connect();
  try {
    const { name, motor_actuator_id, steps, is_active } = req.body;

    await client.query('BEGIN');

    const planRes = await client.query(
      `UPDATE irrigation_plans
          SET name              = COALESCE($1, name),
              motor_actuator_id = COALESCE($2, motor_actuator_id),
              is_active         = COALESCE($3, is_active),
              updated_at        = NOW()
        WHERE id = $4 AND organization_id = $5
        RETURNING *`,
      [name || null, motor_actuator_id || null, is_active ?? null, req.params.id, req.user.organization_id]
    );
    if (!planRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (Array.isArray(steps)) {
      await client.query('DELETE FROM irrigation_plan_steps WHERE plan_id = $1', [req.params.id]);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const zoneRes = step.zone_id
          ? await client.query('SELECT name FROM zones WHERE id = $1', [step.zone_id])
          : { rows: [] };
        const zoneName = zoneRes.rows[0]?.name || step.zone_name || null;
        await client.query(
          `INSERT INTO irrigation_plan_steps (plan_id, step_order, zone_id, zone_name, duration_minutes)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.params.id, i + 1, step.zone_id || null, zoneName, step.duration_minutes || 15]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: planRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[IrrigationPlans PUT]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update plan' });
  } finally {
    client.release();
  }
});

// DELETE /irrigation-plans/:id
router.delete('/plans/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM irrigation_plans WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error('[IrrigationPlans DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
});

// ─── Plan Execution ─────────────────────────────────────────────────────────

// POST /irrigation-plans/:id/run — start a plan (real or simulation)
router.post('/plans/:id/run', async (req, res) => {
  const client = await db.connect();
  try {
    const { mode } = req.body; // 'real' | 'simulation'
    const isSimulation = mode === 'simulation';

    // Fetch plan
    const planRes = await client.query(
      `SELECT * FROM irrigation_plans WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!planRes.rows.length) return res.status(404).json({ success: false, message: 'Plan not found' });
    const plan = planRes.rows[0];

    // Check: no other REAL plan already running for this farm
    if (!isSimulation) {
      const runningCheck = await client.query(
        `SELECT id FROM irrigation_runs
          WHERE farm_id = $1 AND status = 'running' AND is_simulation = false`,
        [plan.farm_id]
      );
      if (runningCheck.rows.length) {
        return res.status(409).json({ success: false, message: 'Another plan is already running on this farm. Stop it first.' });
      }
    }

    // Fetch steps with valve info
    const stepsRes = await client.query(
      `SELECT s.*, z.valve_actuator_id
       FROM irrigation_plan_steps s
       LEFT JOIN zones z ON z.id = s.zone_id
       WHERE s.plan_id = $1
       ORDER BY s.step_order`,
      [plan.id]
    );
    const steps = stepsRes.rows;
    if (!steps.length) return res.status(400).json({ success: false, message: 'Plan has no steps' });

    await client.query('BEGIN');

    // Create run record
    const runRes = await client.query(
      `INSERT INTO irrigation_runs
         (plan_id, plan_name, farm_id, organization_id, total_steps, triggered_by, is_simulation)
       VALUES ($1, $2, $3, $4, $5, 'manual', $6)
       RETURNING *`,
      [plan.id, plan.name, plan.farm_id, req.user.organization_id, steps.length, isSimulation]
    );
    const run = runRes.rows[0];

    // Pre-create step logs as 'pending'
    for (const step of steps) {
      await client.query(
        `INSERT INTO irrigation_run_logs (run_id, step_order, zone_id, zone_name, duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [run.id, step.step_order, step.zone_id || null, step.zone_name, step.duration_minutes]
      );
    }

    await client.query('COMMIT');

    // Register run as active so it can be cancelled
    activeRuns.set(run.id, { cancel: () => {} }); // placeholder, overwritten in executePlan

    // Fire-and-forget execution (non-blocking)
    executePlan(run.id, plan, steps, isSimulation);

    res.status(201).json({ success: true, data: { run_id: run.id, is_simulation: isSimulation } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[IrrigationRun START]', err.message);
    res.status(500).json({ success: false, message: 'Failed to start plan' });
  } finally {
    client.release();
  }
});

// POST /irrigation-runs/:id/stop — abort a running plan
router.post('/runs/:id/stop', async (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);

    // Verify belongs to org
    const runRes = await db.query(
      'SELECT id, status FROM irrigation_runs WHERE id = $1 AND organization_id = $2',
      [runId, req.user.organization_id]
    );
    if (!runRes.rows.length) return res.status(404).json({ success: false, message: 'Run not found' });
    if (runRes.rows[0].status !== 'running') {
      return res.status(400).json({ success: false, message: 'Run is not active' });
    }

    const entry = activeRuns.get(runId);
    if (entry?.cancel) {
      entry.cancel();
    } else {
      // Run finished between check and cancel — mark aborted anyway
      await db.query(
        `UPDATE irrigation_runs SET status = 'aborted', completed_at = NOW() WHERE id = $1`,
        [runId]
      );
    }

    res.json({ success: true, data: { run_id: runId, status: 'aborted' } });
  } catch (err) {
    console.error('[IrrigationRun STOP]', err.message);
    res.status(500).json({ success: false, message: 'Failed to stop run' });
  }
});

// GET /irrigation-runs/:id — poll run status + step logs
router.get('/runs/:id', async (req, res) => {
  try {
    const runRes = await db.query(
      `SELECT * FROM irrigation_runs WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );
    if (!runRes.rows.length) return res.status(404).json({ success: false, message: 'Run not found' });

    const logsRes = await db.query(
      `SELECT * FROM irrigation_run_logs WHERE run_id = $1 ORDER BY step_order`,
      [req.params.id]
    );

    res.json({ success: true, data: { run: runRes.rows[0], steps: logsRes.rows } });
  } catch (err) {
    console.error('[IrrigationRun GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch run' });
  }
});

// GET /irrigation-runs?farm_id= — run history for a farm
router.get('/runs', async (req, res) => {
  try {
    const { farm_id } = req.query;
    if (!farm_id) return res.status(400).json({ success: false, message: 'farm_id required' });

    const result = await db.query(
      `SELECT r.*, array_agg(
         json_build_object(
           'step_order', l.step_order,
           'zone_name', l.zone_name,
           'duration_minutes', l.duration_minutes,
           'status', l.status,
           'started_at', l.started_at,
           'completed_at', l.completed_at
         ) ORDER BY l.step_order
       ) AS steps
       FROM irrigation_runs r
       LEFT JOIN irrigation_run_logs l ON l.run_id = r.id
       WHERE r.farm_id = $1 AND r.organization_id = $2
       GROUP BY r.id
       ORDER BY r.started_at DESC
       LIMIT 50`,
      [farm_id, req.user.organization_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[IrrigationRuns GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch run history' });
  }
});

module.exports = router;
