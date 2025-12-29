-- Add telegram column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram text;