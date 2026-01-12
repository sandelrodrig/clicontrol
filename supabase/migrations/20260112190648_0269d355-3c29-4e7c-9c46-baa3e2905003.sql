-- Create function to add reseller templates for existing and new sellers
CREATE OR REPLACE FUNCTION public.create_reseller_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Revendedor - Welcome template
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES (
    seller_uuid,
    'Revendedor - Boas-vindas',
    'welcome',
    '🎉 *Bem-vindo(a), {nome}!*

Você agora é nosso revendedor parceiro! 🤝

📋 *Seus dados de acesso:*
🔗 Link do Painel: {link_painel}
👤 Usuário: {usuario}
🔐 Senha: {senha}

📡 Servidor: {servidor}
📅 Vencimento: {vencimento}

Qualquer dúvida, estamos à disposição!

*{empresa}*',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Revendedor - Billing/Collection template
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES (
    seller_uuid,
    'Revendedor - Cobrança',
    'billing',
    '💰 *Lembrete de Pagamento*

Olá, {nome}!

Seu acesso de revendedor vence em *{vencimento}*.

💵 *Valor: R$ {valor}*

📋 *Seus dados atuais:*
🔗 Painel: {link_painel}
👤 Usuário: {usuario}
📡 Servidor: {servidor}

🔑 *PIX para renovação:*
{pix}

Após o pagamento, envie o comprovante para renovarmos seu acesso!

*{empresa}*',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Revendedor - Renewal template
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES (
    seller_uuid,
    'Revendedor - Renovação',
    'renewal',
    '✅ *Renovação Confirmada!*

Olá, {nome}!

Seu acesso de revendedor foi renovado com sucesso! 🎉

📋 *Dados de acesso:*
🔗 Link do Painel: {link_painel}
👤 Usuário: {usuario}
🔐 Senha: {senha}

📡 Servidor: {servidor}
📅 Novo vencimento: {vencimento}

Boas vendas! 💪

*{empresa}*',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Revendedor - Expiring 3 days template
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES (
    seller_uuid,
    'Revendedor - Vencimento (3 dias)',
    'expiring_3days',
    '⏰ *Atenção, {nome}!*

Seu acesso de revendedor vence em *3 dias* ({vencimento}).

🔗 Painel: {link_painel}
📡 Servidor: {servidor}

Para não perder acesso, renove agora!

🔑 *PIX:* {pix}

*{empresa}*',
    true
  )
  ON CONFLICT DO NOTHING;

  -- Revendedor - Credentials template
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES (
    seller_uuid,
    'Revendedor - Credenciais',
    'credentials',
    '🔐 *Suas Credenciais de Revendedor*

Olá, {nome}!

📋 *Dados de acesso:*
🔗 Link do Painel: {link_painel}
👤 Usuário: {usuario}
🔐 Senha: {senha}

📡 Servidor: {servidor}
📅 Vencimento: {vencimento}

*{empresa}*',
    true
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Add reseller templates for all existing sellers
DO $$
DECLARE
  seller_record RECORD;
BEGIN
  FOR seller_record IN 
    SELECT DISTINCT user_id FROM user_roles WHERE role = 'seller'
  LOOP
    PERFORM create_reseller_templates_for_seller(seller_record.user_id);
  END LOOP;
END $$;