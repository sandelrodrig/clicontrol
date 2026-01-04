-- Add premium_price column to clients table for combined pricing (IPTV + Premium)
ALTER TABLE public.clients 
ADD COLUMN premium_price numeric DEFAULT NULL;