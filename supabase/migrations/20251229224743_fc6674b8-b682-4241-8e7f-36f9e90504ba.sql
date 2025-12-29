-- Add category and screens fields to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'IPTV',
ADD COLUMN IF NOT EXISTS screens integer DEFAULT 1;