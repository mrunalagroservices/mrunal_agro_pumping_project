-- Idempotent migration: adds admin-managed Mandi homepage promo banners.
-- Safe to run multiple times, and on both local Postgres and Neon production.

CREATE TABLE IF NOT EXISTS shop_banners (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(150) NOT NULL,
  subtitle      VARCHAR(255),
  image_url     TEXT,
  gradient_from VARCHAR(7) NOT NULL DEFAULT '#7c3aed',
  gradient_to   VARCHAR(7) NOT NULL DEFAULT '#4f46e5',
  icon          VARCHAR(50),
  link_url      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_banners_active ON shop_banners(is_active, sort_order);
