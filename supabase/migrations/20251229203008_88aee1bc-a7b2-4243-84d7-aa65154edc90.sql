-- Tabela de templates de mensagem
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own templates" ON public.whatsapp_templates
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own templates" ON public.whatsapp_templates
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own templates" ON public.whatsapp_templates
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own templates" ON public.whatsapp_templates
FOR DELETE USING (auth.uid() = seller_id);

-- Tabela de cupons
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  discount_type discount_type DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_plan_value NUMERIC,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own coupons" ON public.coupons
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own coupons" ON public.coupons
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own coupons" ON public.coupons
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own coupons" ON public.coupons
FOR DELETE USING (auth.uid() = seller_id);

-- Tabela de indicações
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  referred_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  discount_percentage NUMERIC DEFAULT 50,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own referrals" ON public.referrals
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own referrals" ON public.referrals
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own referrals" ON public.referrals
FOR DELETE USING (auth.uid() = seller_id);

-- Tabela de contas a pagar
CREATE TABLE public.bills_to_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  description TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_whatsapp TEXT,
  recipient_pix TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.bills_to_pay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own bills" ON public.bills_to_pay
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own bills" ON public.bills_to_pay
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own bills" ON public.bills_to_pay
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own bills" ON public.bills_to_pay
FOR DELETE USING (auth.uid() = seller_id);

-- Adicionar referral_code aos clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Trigger para gerar código de indicação
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 6));
      SELECT EXISTS(SELECT 1 FROM clients WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Triggers de updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_to_pay_updated_at
  BEFORE UPDATE ON public.bills_to_pay
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();