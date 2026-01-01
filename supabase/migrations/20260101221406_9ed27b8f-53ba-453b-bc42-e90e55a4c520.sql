-- Adicionar campo MAC address do GerenciaApp na tabela clients
ALTER TABLE public.clients
ADD COLUMN gerencia_app_mac text;

-- Adicionar configurações do GerenciaApp nas app_settings (se não existirem)
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('gerencia_app_panel_url', 'https://gerenciapp.top', 'URL do painel GerenciaApp para acesso rápido'),
  ('gerencia_app_register_url', '', 'Link de cadastro afiliado do Admin para revendedores no GerenciaApp')
ON CONFLICT (key) DO NOTHING;