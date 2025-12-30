
-- Função para auto-configurar créditos de servidores conhecidos
CREATE OR REPLACE FUNCTION public.auto_configure_server_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Configurar créditos automaticamente baseado no nome do servidor
  CASE UPPER(NEW.name)
    WHEN 'WPLAY' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 1;
    WHEN 'ALPHA SERVER' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 0;
    WHEN 'NETPLAY' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 2;
      NEW.p2p_per_credit := 0;
    WHEN 'AZIONIX' THEN
      NEW.is_credit_based := true;
      NEW.iptv_per_credit := 3;
      NEW.p2p_per_credit := 0;
    ELSE
      -- Para outros servidores, manter valores padrão (vazios/0)
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para aplicar auto-configuração ao criar servidor
DROP TRIGGER IF EXISTS auto_configure_server_credits_trigger ON servers;
CREATE TRIGGER auto_configure_server_credits_trigger
  BEFORE INSERT ON servers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_configure_server_credits();
