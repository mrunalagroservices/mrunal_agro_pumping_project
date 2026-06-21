const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);

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
    const result = await db.query(
      `SELECT id, question, answer FROM faq_topics WHERE is_active = true ORDER BY sort_order ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Support]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
  }
});

module.exports = router;
