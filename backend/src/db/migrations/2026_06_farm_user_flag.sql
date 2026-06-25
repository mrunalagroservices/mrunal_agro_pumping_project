-- Idempotent migration: adds an explicit flag distinguishing farm/pump-control
-- accounts from Mandi-only marketplace buyers.
-- Safe to run multiple times, and on both local Postgres and Neon production.

-- Default true: every account created before this column existed went through
-- the org+owner signup flow and owns (or will own) pump hardware.
ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_user BOOLEAN NOT NULL DEFAULT true;
