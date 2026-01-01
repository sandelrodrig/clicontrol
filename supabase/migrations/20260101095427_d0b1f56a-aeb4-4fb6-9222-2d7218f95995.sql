-- Add renewed_at field to track when client was last renewed/paid
ALTER TABLE public.clients 
ADD COLUMN renewed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Set initial value for existing clients based on their created_at or updated_at
UPDATE public.clients 
SET renewed_at = COALESCE(updated_at, created_at, now())
WHERE renewed_at IS NULL;