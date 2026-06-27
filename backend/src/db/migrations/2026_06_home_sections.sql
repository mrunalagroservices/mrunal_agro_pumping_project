-- Idempotent migration: admin-curated product rows for the Mandi homepage
-- ("Popular Products", "Deals of the Day", per-category rows, etc).
-- Safe to run multiple times, and on both local Postgres and Neon production.

CREATE TABLE IF NOT EXISTS home_product_sections (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(150) NOT NULL,
  subtitle    VARCHAR(255),
  source      VARCHAR(30) NOT NULL DEFAULT 'best_seller',
  category    VARCHAR(100),
  layout      VARCHAR(20) NOT NULL DEFAULT 'row',
  max_items   INTEGER NOT NULL DEFAULT 10,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_home_product_sections_active ON home_product_sections(is_active, sort_order);

-- Seed two sensible defaults so the homepage isn't empty on first load (only
-- if the table has no rows yet).
INSERT INTO home_product_sections (title, source, layout, max_items, sort_order)
SELECT 'Popular Products', 'best_seller', 'row', 12, 1
WHERE NOT EXISTS (SELECT 1 FROM home_product_sections);

INSERT INTO home_product_sections (title, source, layout, max_items, sort_order)
SELECT 'Deals Of The Day', 'deals', 'row', 12, 2
WHERE NOT EXISTS (SELECT 1 FROM home_product_sections WHERE source = 'deals');
