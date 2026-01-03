-- Add price and cost columns to external_apps table
-- price = what seller charges the client
-- cost = what seller pays for activation
ALTER TABLE public.external_apps
ADD COLUMN price numeric DEFAULT 0,
ADD COLUMN cost numeric DEFAULT 0;