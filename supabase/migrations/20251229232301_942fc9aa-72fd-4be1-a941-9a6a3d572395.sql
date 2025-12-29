-- Add columns for paid apps functionality
ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_paid_apps boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paid_apps_duration text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paid_apps_expiration date;