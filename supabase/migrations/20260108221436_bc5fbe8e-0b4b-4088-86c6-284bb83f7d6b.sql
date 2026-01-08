-- Create table for multiple premium accounts per client
CREATE TABLE public.client_premium_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  email TEXT,
  password TEXT,
  price NUMERIC DEFAULT 0,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_premium_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sellers can view their own premium accounts"
ON public.client_premium_accounts
FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own premium accounts"
ON public.client_premium_accounts
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own premium accounts"
ON public.client_premium_accounts
FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own premium accounts"
ON public.client_premium_accounts
FOR DELETE
USING (auth.uid() = seller_id);