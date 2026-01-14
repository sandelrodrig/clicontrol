-- Add app_type field to distinguish between server app and reseller's own app
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS app_type TEXT DEFAULT 'server' CHECK (app_type IN ('server', 'own'));

-- Add expected_payment_date for unpaid clients to track when payment is expected
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS expected_payment_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.app_type IS 'Type of app used: server (app do servidor) or own (app próprio do revendedor)';
COMMENT ON COLUMN public.clients.expected_payment_date IS 'Expected payment date for unpaid clients';