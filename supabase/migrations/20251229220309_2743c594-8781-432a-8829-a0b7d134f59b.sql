-- Adicionar coluna de categoria aos clientes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'IPTV';

-- Adicionar coluna para senha de conta premium
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS premium_password TEXT;

-- Criar tabela para categorias personalizadas dos vendedores
CREATE TABLE IF NOT EXISTS public.client_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id, name)
);

-- Habilitar RLS
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Sellers can view their own categories"
ON public.client_categories FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own categories"
ON public.client_categories FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own categories"
ON public.client_categories FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own categories"
ON public.client_categories FOR DELETE
USING (auth.uid() = seller_id);

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients(category);
CREATE INDEX IF NOT EXISTS idx_client_categories_seller ON public.client_categories(seller_id);