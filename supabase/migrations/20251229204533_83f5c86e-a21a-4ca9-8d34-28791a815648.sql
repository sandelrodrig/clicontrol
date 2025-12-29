-- Tabela para Créditos Compartilhados (Painéis P2P/IPTV)
CREATE TABLE public.shared_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  panel_type TEXT NOT NULL DEFAULT 'iptv', -- 'iptv' ou 'p2p'
  total_slots INTEGER NOT NULL DEFAULT 1,
  used_slots INTEGER NOT NULL DEFAULT 0,
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  login TEXT,
  password TEXT,
  url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para associar clientes aos painéis compartilhados
CREATE TABLE public.panel_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_id UUID NOT NULL REFERENCES public.shared_panels(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(panel_id, client_id)
);

-- Tabela para histórico de mensagens
CREATE TABLE public.message_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL, -- 'welcome', 'renewal', 'expiring', 'credentials', 'custom'
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  phone TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.shared_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_panels
CREATE POLICY "Sellers can view their own panels" ON public.shared_panels
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own panels" ON public.shared_panels
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own panels" ON public.shared_panels
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own panels" ON public.shared_panels
  FOR DELETE USING (auth.uid() = seller_id);

-- RLS Policies for panel_clients
CREATE POLICY "Sellers can view their own panel_clients" ON public.panel_clients
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own panel_clients" ON public.panel_clients
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own panel_clients" ON public.panel_clients
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own panel_clients" ON public.panel_clients
  FOR DELETE USING (auth.uid() = seller_id);

-- RLS Policies for message_history
CREATE POLICY "Sellers can view their own messages" ON public.message_history
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own messages" ON public.message_history
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own messages" ON public.message_history
  FOR DELETE USING (auth.uid() = seller_id);

-- Triggers for updated_at
CREATE TRIGGER update_shared_panels_updated_at
  BEFORE UPDATE ON public.shared_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update used_slots count
CREATE OR REPLACE FUNCTION public.update_panel_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shared_panels SET used_slots = used_slots + 1 WHERE id = NEW.panel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shared_panels SET used_slots = used_slots - 1 WHERE id = OLD.panel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_panel_slots_trigger
  AFTER INSERT OR DELETE ON public.panel_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_panel_slots();