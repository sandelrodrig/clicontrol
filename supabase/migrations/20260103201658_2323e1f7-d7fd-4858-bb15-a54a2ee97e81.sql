-- Adicionar campo para armazenar múltiplos dispositivos MAC com seus nomes
ALTER TABLE public.clients
ADD COLUMN gerencia_app_devices jsonb DEFAULT '[]'::jsonb;

-- Migrar dados existentes do campo gerencia_app_mac para o novo formato
UPDATE public.clients 
SET gerencia_app_devices = jsonb_build_array(jsonb_build_object('name', 'Dispositivo 1', 'mac', gerencia_app_mac))
WHERE gerencia_app_mac IS NOT NULL AND gerencia_app_mac != '';

COMMENT ON COLUMN public.clients.gerencia_app_devices IS 'Array de dispositivos MAC no formato [{name: string, mac: string}], máximo 5 dispositivos';