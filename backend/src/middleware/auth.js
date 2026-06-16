const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verifies JWT and attaches { id, organization_id, role, email } to req.user.
// Every module query must scope by req.user.organization_id for tenant isolation.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

// Authenticates ESP32 devices using their API key.
// Attaches req.device = { id, organization_id } so route handlers can scope queries.
async function requireDeviceApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ success: false, message: 'Missing API key' });
  try {
    const result = await db.query(
      'SELECT id, organization_id FROM devices WHERE api_key = $1',
      [apiKey]
    );
    if (!result.rows.length) return res.status(401).json({ success: false, message: 'Invalid API key' });
    req.device = result.rows[0];
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Auth error' });
  }
}

module.exports = { requireAuth, requireRole, requireAdmin, requireDeviceApiKey };
