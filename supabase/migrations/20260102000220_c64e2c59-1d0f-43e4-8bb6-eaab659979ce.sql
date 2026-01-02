-- Add columns for paid apps credentials
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paid_apps_email text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS paid_apps_password text;