-- Create indexes for frequently queried fields to improve performance
CREATE INDEX IF NOT EXISTS idx_clients_seller_id ON public.clients(seller_id);
CREATE INDEX IF NOT EXISTS idx_clients_login ON public.clients(login);
CREATE INDEX IF NOT EXISTS idx_clients_dns ON public.clients(dns);
CREATE INDEX IF NOT EXISTS idx_clients_server_id ON public.clients(server_id);
CREATE INDEX IF NOT EXISTS idx_clients_expiration_date ON public.clients(expiration_date);
CREATE INDEX IF NOT EXISTS idx_clients_is_archived ON public.clients(is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients(category);
CREATE INDEX IF NOT EXISTS idx_clients_is_paid ON public.clients(is_paid);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_clients_seller_archived ON public.clients(seller_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_seller_expiration ON public.clients(seller_id, expiration_date);