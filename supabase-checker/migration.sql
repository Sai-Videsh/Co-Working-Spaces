-- ============================================================
-- migration.sql  -  Fix co-working platform Supabase schema
-- Based on: live checker run (2026-03-10)
--
-- Actual findings:
--   working_hubs  : missing updated_at
--   workspaces    : missing description, is_available, updated_at
--   booking_resources: table is empty - adding price column
--   ratings       : missing user_email, booking_id
--   pricing_rules : missing created_at
--   bookings      : 5 rows with NULL user_email (data fix)
--
-- Apply in Supabase SQL Editor.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. working_hubs  - add updated_at
-- ---------------------------------------------------------------
ALTER TABLE working_hubs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE working_hubs SET updated_at = created_at WHERE updated_at IS NULL;

-- ---------------------------------------------------------------
-- 2. workspaces  - add description, is_available, updated_at
-- ---------------------------------------------------------------
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE workspaces SET updated_at   = created_at WHERE updated_at   IS NULL;
UPDATE workspaces SET is_available = true       WHERE is_available IS NULL;

-- ---------------------------------------------------------------
-- 3. ratings  - add user_email, booking_id
-- ---------------------------------------------------------------
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS user_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);

-- ---------------------------------------------------------------
-- 4. pricing_rules  - add created_at
-- ---------------------------------------------------------------
ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE pricing_rules SET created_at = NOW() WHERE created_at IS NULL;

-- ---------------------------------------------------------------
-- 5. booking_resources  - add price column
-- ---------------------------------------------------------------
ALTER TABLE booking_resources
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;

-- ---------------------------------------------------------------
-- 6. Data fix: patch NULL user_email on legacy bookings
-- ---------------------------------------------------------------
UPDATE bookings
SET user_email = 'unknown@legacy.local'
WHERE user_email IS NULL;

-- ---------------------------------------------------------------
-- 7. Auto-update triggers for the new updated_at columns
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_working_hubs_updated_at ON working_hubs;
CREATE TRIGGER update_working_hubs_updated_at
  BEFORE UPDATE ON working_hubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------
SELECT 'Migration complete' AS status;
