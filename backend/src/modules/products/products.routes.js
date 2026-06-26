const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// Aggregates real reviews where they exist, falling back to the admin-seeded
// rating/review_count columns for products with no reviews yet.
const PRODUCT_SELECT = `
  SELECT
    p.*,
    COALESCE(r.review_count, 0) AS live_review_count,
    COALESCE(r.avg_rating, p.rating) AS live_rating
  FROM products p
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS review_count, ROUND(AVG(rating)::numeric, 2) AS avg_rating
    FROM product_reviews
    GROUP BY product_id
  ) r ON r.product_id = p.id
`;

function shapeProduct(row) {
  const { live_review_count, live_rating, ...rest } = row;
  return {
    ...rest,
    rating: live_rating != null ? Number(live_rating) : Number(row.rating),
    review_count: live_review_count != null ? Number(live_review_count) : row.review_count,
  };
}

// GET /api/v1/products/wishlist/mine — full product rows the user has saved
// (declared before /:id so the literal "wishlist" segment isn't swallowed by it)
router.get('/wishlist/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         p.*,
         COALESCE(r.review_count, 0) AS live_review_count,
         COALESCE(r.avg_rating, p.rating) AS live_rating,
         w.created_at AS wishlisted_at
       FROM user_wishlist w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN (
         SELECT product_id, COUNT(*) AS review_count, ROUND(AVG(rating)::numeric, 2) AS avg_rating
         FROM product_reviews
         GROUP BY product_id
       ) r ON r.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows.map(shapeProduct) });
  } catch (err) {
    console.error('[Wishlist GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
  }
});

// GET /api/v1/products — public, browsable without an account (the Mandi
// homepage is open to anonymous visitors; login is only required to add to
// cart/wishlist, write a review, or check out)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `${PRODUCT_SELECT} WHERE p.is_active = true ORDER BY p.is_best_seller DESC, p.created_at DESC`
    );
    res.json({ success: true, data: result.rows.map(shapeProduct) });
  } catch (err) {
    console.error('[Products GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// GET /api/v1/products/:id — public, same as the list above
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`${PRODUCT_SELECT} WHERE p.id = $1 AND p.is_active = true`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: shapeProduct(result.rows[0]) });
  } catch (err) {
    console.error('[Products GET one]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// GET /api/v1/products/:id/reviews — public, same as the product itself
router.get('/:id/reviews', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pr.id, pr.rating, pr.comment, pr.created_at, u.name AS user_name
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Products reviews GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// POST /api/v1/products/:id/reviews — one review per user per product (upsert)
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const { rating, comment } = req.body;
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
  }
  try {
    const result = await db.query(
      `INSERT INTO product_reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
       RETURNING id, rating, comment, created_at`,
      [req.params.id, req.user.id, ratingNum, comment || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Products reviews POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

// POST /api/v1/products/:id/wishlist — add to wishlist
router.post('/:id/wishlist', requireAuth, async (req, res) => {
  try {
    await db.query(
      `INSERT INTO user_wishlist (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user.id, req.params.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[Wishlist POST]', err.message);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
});

// DELETE /api/v1/products/:id/wishlist — remove from wishlist
router.delete('/:id/wishlist', requireAuth, async (req, res) => {
  try {
    await db.query(`DELETE FROM user_wishlist WHERE user_id = $1 AND product_id = $2`, [req.user.id, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Wishlist DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
