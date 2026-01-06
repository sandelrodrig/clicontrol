-- Create custom products table for sellers to create their own product types
CREATE TABLE public.custom_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL, -- e.g., "Netflix", "Spotify", "Disney+"
  icon TEXT DEFAULT '📦', -- emoji icon for the product
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sellers can view their own products"
ON public.custom_products FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own products"
ON public.custom_products FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products"
ON public.custom_products FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products"
ON public.custom_products FOR DELETE
USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_custom_products_updated_at
BEFORE UPDATE ON public.custom_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate templates for a new custom product
CREATE OR REPLACE FUNCTION public.create_templates_for_custom_product(
  p_seller_id UUID,
  p_product_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert templates for the new product
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default) VALUES
  -- Welcome template
  (p_seller_id, p_product_name || ' - Boas-vindas', 'welcome', 
   'Olá {nome}! 🎉

Seja bem-vindo(a) à {empresa}!

Seus dados de acesso ' || p_product_name || ':
📧 Email: {email_premium}
🔐 Senha: {senha_premium}

📅 Validade: {vencimento}

Aproveite! Qualquer dúvida, estou à disposição!', true),

  -- Expiring 3 days
  (p_seller_id, p_product_name || ' - Vencimento (3 dias)', 'expiring_3days',
   'Olá {nome}! ⏰

Sua assinatura ' || p_product_name || ' vence em *3 dias* ({vencimento}).

💰 Valor: R$ {valor}

Renove agora e continue aproveitando!

PIX: {pix}', true),

  -- Expiring 2 days
  (p_seller_id, p_product_name || ' - Vencimento (2 dias)', 'expiring_2days',
   'Olá {nome}! ⏰

Sua assinatura ' || p_product_name || ' vence em *2 dias* ({vencimento}).

💰 Valor: R$ {valor}

Não deixe para última hora!

PIX: {pix}', true),

  -- Expiring 1 day
  (p_seller_id, p_product_name || ' - Vencimento (1 dia)', 'expiring_1day',
   'Olá {nome}! 🔔

Sua assinatura ' || p_product_name || ' vence *amanhã* ({vencimento})!

💰 Valor: R$ {valor}

Renove agora para não perder o acesso!

PIX: {pix}', true),

  -- Expired
  (p_seller_id, p_product_name || ' - Vencido', 'expired',
   'Olá {nome}! ❌

Sua assinatura ' || p_product_name || ' venceu em {vencimento}.

Renove agora e volte a aproveitar!

💰 Valor: R$ {valor}
PIX: {pix}', true),

  -- Billing
  (p_seller_id, p_product_name || ' - Cobrança', 'billing',
   'Olá {nome}! 💰

Lembrete de pagamento ' || p_product_name || '.

📅 Vencimento: {vencimento}
💰 Valor: R$ {valor}

PIX: {pix}

Após o pagamento, envie o comprovante!', true),

  -- Renewal
  (p_seller_id, p_product_name || ' - Renovação', 'renewal',
   'Olá {nome}! ✅

Sua renovação ' || p_product_name || ' foi confirmada!

📧 Email: {email_premium}
🔐 Senha: {senha_premium}
📅 Nova validade: {vencimento}

Obrigado pela confiança! 🙏', true),

  -- Credentials
  (p_seller_id, p_product_name || ' - Credenciais', 'credentials',
   'Olá {nome}! 🔐

Credenciais ' || p_product_name || ':

📧 Email: {email_premium}
🔐 Senha: {senha_premium}

📅 Validade: {vencimento}

Guarde essas informações com segurança!', true)

  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to auto-generate default plans for a new custom product
CREATE OR REPLACE FUNCTION public.create_plans_for_custom_product(
  p_seller_id UUID,
  p_product_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.plans (seller_id, name, price, duration_days, category, is_active)
  VALUES 
    (p_seller_id, p_product_name || ' Mensal', 0, 30, p_product_name, true),
    (p_seller_id, p_product_name || ' Trimestral', 0, 90, p_product_name, true),
    (p_seller_id, p_product_name || ' Semestral', 0, 180, p_product_name, true),
    (p_seller_id, p_product_name || ' Anual', 0, 365, p_product_name, true)
  ON CONFLICT DO NOTHING;
END;
$$;