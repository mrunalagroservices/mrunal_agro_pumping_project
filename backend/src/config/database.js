const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
