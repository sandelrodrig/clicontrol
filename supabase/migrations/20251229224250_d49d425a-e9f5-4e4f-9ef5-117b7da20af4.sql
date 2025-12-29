-- Add credit-based fields to servers table
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS is_credit_based boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_credits numeric DEFAULT 0;