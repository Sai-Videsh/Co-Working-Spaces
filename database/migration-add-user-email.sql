-- Migration: Add user_email column to bookings table
-- Run this in your Supabase SQL Editor (https://supabase.com → SQL Editor)
-- After running this, the backend will automatically use user_email for filtering.

-- 1. Add the column (safe to run multiple times)
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- 2. Create an index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);
