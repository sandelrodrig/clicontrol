-- Add fingerprint column to clients table for fast credential matching
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS credentials_fingerprint TEXT;

-- Create index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_clients_credentials_fingerprint ON public.clients(credentials_fingerprint);

-- Composite index for server + fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_clients_server_fingerprint ON public.clients(server_id, credentials_fingerprint) WHERE credentials_fingerprint IS NOT NULL;