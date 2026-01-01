-- Create table for monthly profit history
CREATE TABLE public.monthly_profits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  revenue NUMERIC NOT NULL DEFAULT 0,
  server_costs NUMERIC NOT NULL DEFAULT 0,
  bills_costs NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  active_clients INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_profits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sellers can view their own profits"
  ON public.monthly_profits
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own profits"
  ON public.monthly_profits
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own profits"
  ON public.monthly_profits
  FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own profits"
  ON public.monthly_profits
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_profits_updated_at
  BEFORE UPDATE ON public.monthly_profits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();