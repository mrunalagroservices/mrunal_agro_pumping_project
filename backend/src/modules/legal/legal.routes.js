const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// GET /api/v1/legal/documents — list (no body, for a menu)
router.get('/documents', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT slug, title, updated_at FROM legal_documents ORDER BY sort_order ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Legal]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch legal documents' });
  }
});

// GET /api/v1/legal/documents/:slug — full document
router.get('/documents/:slug', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT slug, title, sections, updated_at FROM legal_documents WHERE slug = $1`,
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Legal]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch legal document' });
  }
});

module.exports = router;
