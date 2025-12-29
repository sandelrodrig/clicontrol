-- Add panel URL field to servers table
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS panel_url text;