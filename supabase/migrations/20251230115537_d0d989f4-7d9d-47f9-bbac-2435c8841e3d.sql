-- Adicionar campo para marcar clientes como arquivados (lixeira)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Adicionar campo para registrar quando foi arquivado
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Criar índice para consultas de clientes arquivados
CREATE INDEX IF NOT EXISTS idx_clients_archived ON public.clients(is_archived, seller_id);