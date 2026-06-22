const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

// Accepts ?lang=hi|mr, defaults to English. Any other value falls back to 'en'.
function pickLang(req) {
  const lang = req.query.lang;
  return lang === 'hi' || lang === 'mr' ? lang : 'en';
}

function localizeDoc(row, lang) {
  const title = lang !== 'en' && row[`title_${lang}`] ? row[`title_${lang}`] : row.title;
  const sections =
    lang !== 'en' && Array.isArray(row[`sections_${lang}`]) && row[`sections_${lang}`].length
      ? row[`sections_${lang}`]
      : row.sections;
  return { slug: row.slug, title, sections, updated_at: row.updated_at };
}

// GET /api/v1/legal/documents — list (no body, for a menu)
router.get('/documents', async (req, res) => {
  try {
    const lang = pickLang(req);
    const result = await db.query(
      `SELECT slug, title, title_hi, title_mr, updated_at FROM legal_documents ORDER BY sort_order ASC`
    );
    const data = result.rows.map((row) => ({
      slug: row.slug,
      title: lang !== 'en' && row[`title_${lang}`] ? row[`title_${lang}`] : row.title,
      updated_at: row.updated_at,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Legal]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch legal documents' });
  }
});

// GET /api/v1/legal/documents/:slug — full document
router.get('/documents/:slug', async (req, res) => {
  try {
    const lang = pickLang(req);
    const result = await db.query(
      `SELECT slug, title, title_hi, title_mr, sections, sections_hi, sections_mr, updated_at
       FROM legal_documents WHERE slug = $1`,
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: localizeDoc(result.rows[0], lang) });
  } catch (err) {
    console.error('[Legal]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch legal document' });
  }
});

module.exports = router;
