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

// GET /api/v1/support/contact
router.get('/contact', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT support_email, support_phone, support_hours FROM organizations WHERE id = $1`,
      [req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Support]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch support contact' });
  }
});

// GET /api/v1/support/faqs
router.get('/faqs', async (req, res) => {
  try {
    const lang = pickLang(req);
    const result = await db.query(
      `SELECT id, question, question_hi, question_mr, answer, answer_hi, answer_mr
       FROM faq_topics WHERE is_active = true ORDER BY sort_order ASC`
    );
    const data = result.rows.map((row) => ({
      id: row.id,
      question: (lang !== 'en' && row[`question_${lang}`]) || row.question,
      answer: (lang !== 'en' && row[`answer_${lang}`]) || row.answer,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Support]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
  }
});

module.exports = router;
