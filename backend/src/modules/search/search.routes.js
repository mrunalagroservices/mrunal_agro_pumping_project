const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// POST /api/v1/search/log — log a search query (fire-and-forget)
router.post('/log', requireAuth, async (req, res) => {
  const { query, results_count } = req.body;
  if (!query?.trim()) return res.status(400).json({ success: false, message: 'query is required' });

  try {
    await db.query(
      `INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)`,
      [req.user.id, query.trim().slice(0, 255), Number(results_count) || 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Search log]', err.message);
    res.status(500).json({ success: false, message: 'Failed to log search' });
  }
});

module.exports = router;
