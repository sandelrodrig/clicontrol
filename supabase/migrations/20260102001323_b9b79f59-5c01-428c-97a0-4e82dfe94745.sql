-- Add app_name column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS app_name text;