-- Add shared credits configuration to servers
ALTER TABLE public.servers
ADD COLUMN IF NOT EXISTS iptv_per_credit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS p2p_per_credit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_price numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.servers.iptv_per_credit IS 'Number of IPTV slots per credit';
COMMENT ON COLUMN public.servers.p2p_per_credit IS 'Number of P2P slots per credit';
COMMENT ON COLUMN public.servers.credit_price IS 'Monthly price per credit for pro-rata calculation';