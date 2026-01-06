-- Add pending_amount column for partial payments
ALTER TABLE public.clients 
ADD COLUMN pending_amount numeric DEFAULT 0;