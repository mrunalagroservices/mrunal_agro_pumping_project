-- Idempotent migration: supports the redesigned Mandi homepage (grocery-store
-- style skeleton) — "sold by" labels on products and a placement field on
-- banners so the same admin-managed list can drive both the hero carousel
-- and the mid-page 3-card promo strip.
-- Safe to run multiple times, and on both local Postgres and Neon production.

ALTER TABLE products ADD COLUMN IF NOT EXISTS retailer_name VARCHAR(150);
ALTER TABLE products ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(150);

ALTER TABLE shop_banners ADD COLUMN IF NOT EXISTS placement VARCHAR(20) NOT NULL DEFAULT 'hero';
DROP INDEX IF EXISTS idx_shop_banners_active;
CREATE INDEX IF NOT EXISTS idx_shop_banners_active ON shop_banners(is_active, placement, sort_order);
