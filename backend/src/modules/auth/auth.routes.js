const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { id: user.id, organization_id: user.organization_id, role: user.role, email: user.email, is_admin: !!user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/v1/auth/register — creates a new organization + owner user
router.post('/register', async (req, res) => {
  const { organization_name, name, email, password, phone } = req.body;
  if (!organization_name || !name || !email || !password) {
    return res.status(400).json({ success: false, message: 'organization_name, name, email and password are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const org = await client.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
      [organization_name]
    );

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, organization_id, name, email, phone, role, farm_user, created_at`,
      [org.rows[0].id, name, email, passwordHash, phone || null]
    );

    await client.query('COMMIT');

    const token = signToken(user.rows[0]);
    res.status(201).json({ success: true, data: { user: user.rows[0], organization: org.rows[0], token } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth/register]', err.message);
    res.status(500).json({ success: false, message: 'Registration failed' });
  } finally {
    client.release();
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    delete user.password_hash;
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

const ME_COLUMNS = `id, organization_id, name, email, phone, role, is_admin, farm_user,
  preferred_first_name, residential_address, postal_address, emergency_contact,
  analytics_opt_in, deletion_requested_at, notification_preferences,
  preferred_payment_method, created_at`;

const VALID_PAYMENT_METHODS = ['cod', 'card', 'upi'];

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ${ME_COLUMNS} FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// PUT /auth/me — update own profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const {
      name, phone, email, preferred_first_name,
      residential_address, postal_address, emergency_contact,
      analytics_opt_in, notification_preferences, preferred_payment_method,
    } = req.body;

    if (email) {
      const existing = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email, req.user.id]
      );
      if (existing.rows.length) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
    }

    if (preferred_payment_method && !VALID_PAYMENT_METHODS.includes(preferred_payment_method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const result = await db.query(
      `UPDATE users SET
         name                     = COALESCE($1, name),
         phone                    = COALESCE($2, phone),
         email                    = COALESCE($3, email),
         preferred_first_name     = COALESCE($4, preferred_first_name),
         residential_address      = COALESCE($5::jsonb, residential_address),
         postal_address           = COALESCE($6::jsonb, postal_address),
         emergency_contact        = COALESCE($7::jsonb, emergency_contact),
         analytics_opt_in         = COALESCE($8, analytics_opt_in),
         notification_preferences = COALESCE($9::jsonb, notification_preferences),
         preferred_payment_method = COALESCE($10, preferred_payment_method),
         updated_at               = NOW()
       WHERE id = $11
       RETURNING ${ME_COLUMNS}`,
      [
        name || null,
        phone || null,
        email || null,
        preferred_first_name || null,
        residential_address ? JSON.stringify(residential_address) : null,
        postal_address ? JSON.stringify(postal_address) : null,
        emergency_contact ? JSON.stringify(emergency_contact) : null,
        typeof analytics_opt_in === 'boolean' ? analytics_opt_in : null,
        notification_preferences ? JSON.stringify(notification_preferences) : null,
        preferred_payment_method || null,
        req.user.id,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Auth/me PUT]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to update profile' });
  }
});

// POST /auth/me/request-data-export — Privacy → "Request my personal data"
router.post('/me/request-data-export', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO data_export_requests (user_id) VALUES ($1) RETURNING id, status, requested_at`,
      [req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Auth/me request-data-export]', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

// POST /auth/me/request-deletion — Privacy → "Delete my account"
// Soft delete: marks the account for deletion rather than wiping data immediately.
router.post('/me/request-deletion', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET deletion_requested_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING ${ME_COLUMNS}`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Auth/me request-deletion]', err.message);
    res.status(500).json({ success: false, message: 'Failed to request deletion' });
  }
});

// POST /auth/me/cancel-deletion — undo a pending deletion request
router.post('/me/cancel-deletion', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET deletion_requested_at = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING ${ME_COLUMNS}`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Auth/me cancel-deletion]', err.message);
    res.status(500).json({ success: false, message: 'Failed to cancel deletion' });
  }
});

module.exports = router;
