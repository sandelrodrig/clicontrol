
-- Adicionar campo para total de telas por crédito
ALTER TABLE servers ADD COLUMN IF NOT EXISTS total_screens_per_credit integer DEFAULT 0;

-- Atualizar servidores existentes do Sandel
UPDATE servers SET total_screens_per_credit = 3 WHERE UPPER(name) = 'WPLAY';
UPDATE servers SET total_screens_per_credit = 2 WHERE UPPER(name) IN ('ALPHA SERVER', 'NETPLAY');
UPDATE servers SET total_screens_per_credit = 3 WHERE UPPER(name) = 'AZIONIX';

-- Atualizar função de auto-configuração para incluir total_screens_per_credit
CREATE OR REPLACE FUNCTION public.auto_configure_server_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Configurar créditos automaticamente baseado no nome do servidor
  CASE UPPER(NEW.name)
    WHEN 'WPLAY' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 1;
      NEW.total_screens_per_credit := 3;
    WHEN 'ALPHA SERVER' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 0;
      NEW.total_screens_per_credit := 2;
    WHEN 'NETPLAY' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 0;
      NEW.total_screens_per_credit := 2;
    WHEN 'AZIONIX' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 3;
      NEW.p2p_per_credit := 0;
      NEW.total_screens_per_credit := 3;
    ELSE
      -- Para outros servidores, manter valores padrão (vazios/0)
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
