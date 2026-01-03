-- Tabela para cadastrar os aplicativos externos (IBO PRO, Bob Player, etc)
CREATE TABLE public.external_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT,
  auth_type TEXT NOT NULL DEFAULT 'mac_key' CHECK (auth_type IN ('mac_key', 'email_password')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para vincular apps aos clientes com credenciais
CREATE TABLE public.client_external_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  external_app_id UUID NOT NULL REFERENCES public.external_apps(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  -- Para auth_type = 'mac_key': lista de dispositivos MAC
  devices JSONB DEFAULT '[]'::jsonb,
  -- Para auth_type = 'email_password'
  email TEXT,
  password TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, external_app_id)
);

-- Enable RLS
ALTER TABLE public.external_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_external_apps ENABLE ROW LEVEL SECURITY;

-- Políticas para external_apps
CREATE POLICY "Sellers can view their own apps" ON public.external_apps
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own apps" ON public.external_apps
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own apps" ON public.external_apps
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own apps" ON public.external_apps
  FOR DELETE USING (auth.uid() = seller_id);

-- Políticas para client_external_apps
CREATE POLICY "Sellers can view their own client apps" ON public.client_external_apps
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own client apps" ON public.client_external_apps
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own client apps" ON public.client_external_apps
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own client apps" ON public.client_external_apps
  FOR DELETE USING (auth.uid() = seller_id);

-- Trigger para updated_at
CREATE TRIGGER update_external_apps_updated_at
  BEFORE UPDATE ON public.external_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_external_apps_updated_at
  BEFORE UPDATE ON public.client_external_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();