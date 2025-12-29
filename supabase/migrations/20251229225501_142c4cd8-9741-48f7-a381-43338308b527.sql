-- Add credit configuration fields to shared_panels
ALTER TABLE public.shared_panels 
ADD COLUMN IF NOT EXISTS iptv_per_credit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS p2p_per_credit integer DEFAULT 0;