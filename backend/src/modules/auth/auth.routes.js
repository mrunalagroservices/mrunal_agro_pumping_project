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
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, organization_id, name, email, phone, role, created_at`,
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

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, organization_id, name, email, phone, role, is_admin, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

module.exports = router;
