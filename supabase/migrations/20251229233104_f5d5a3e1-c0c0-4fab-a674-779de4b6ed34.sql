-- Add pix_key and company_name columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;