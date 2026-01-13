-- Add DNS field to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dns TEXT;