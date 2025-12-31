-- Add icon_url column to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS icon_url text;