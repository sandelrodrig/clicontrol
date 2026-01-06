-- Create default templates for Premium accounts (universal for all sellers)
-- These will be created via the create_default_templates_for_seller function

-- First, update the function to include Premium templates
CREATE OR REPLACE FUNCTION public.create_default_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- IPTV Templates (existing)
  INSERT INTO whatsapp_templates (seller_id, name, type, message, is_default) VALUES
  (seller_uuid, 'IPTV - Boas-vindas', 'welcome', 'Olá {nome}! 🎉

Seja bem-vindo(a) à {empresa}!

Seus dados de acesso:
📺 Servidor: {servidor}
👤 Login: {login}
🔐 Senha: {senha}

📅 Validade: {vencimento}

Qualquer dúvida, estou à disposição!', true),
  (seller_uuid, 'IPTV - Vencimento (3 dias)', 'expiring_3days', 'Olá {nome}! ⏰

Seu plano {plano} vence em *3 dias* ({vencimento}).

💰 Valor: R$ {valor}

Renove agora e continue aproveitando!

PIX: {pix}', true),
  (seller_uuid, 'IPTV - Vencimento (1 dia)', 'expiring_1day', 'Olá {nome}! 🔔

Seu plano {plano} vence *amanhã* ({vencimento})!

💰 Valor: R$ {valor}

Renove agora para não perder o acesso!

PIX: {pix}', true),
  (seller_uuid, 'IPTV - Vencido', 'expired', 'Olá {nome}! ❌

Seu plano {plano} venceu em {vencimento}.

Renove agora e volte a aproveitar!

💰 Valor: R$ {valor}
PIX: {pix}', true),
  (seller_uuid, 'IPTV - Renovação', 'renewal', 'Olá {nome}! ✅

Sua renovação foi confirmada!

📺 Servidor: {servidor}
📅 Nova validade: {vencimento}

Obrigado pela confiança! 🙏', true),

  -- P2P Templates (existing)
  (seller_uuid, 'P2P - Boas-vindas', 'welcome', 'Olá {nome}! 🎉

Seja bem-vindo(a) à {empresa}!

Seus dados de acesso P2P:
👤 Login: {login}
🔐 Senha: {senha}

📅 Validade: {vencimento}

Qualquer dúvida, estou à disposição!', true),
  (seller_uuid, 'P2P - Vencimento (3 dias)', 'expiring_3days', 'Olá {nome}! ⏰

Seu plano P2P vence em *3 dias* ({vencimento}).

💰 Valor: R$ {valor}

Renove agora e continue aproveitando!

PIX: {pix}', true),
  (seller_uuid, 'P2P - Renovação', 'renewal', 'Olá {nome}! ✅

Sua renovação P2P foi confirmada!

📅 Nova validade: {vencimento}

Obrigado pela confiança! 🙏', true),

  -- Premium Account Templates (NEW)
  (seller_uuid, 'Premium - Boas-vindas', 'welcome', 'Olá {nome}! 🎉

Seja bem-vindo(a) à {empresa}!

Seus dados de acesso {conta_premium}:
📧 Email: {email_premium}
🔐 Senha: {senha_premium}

📅 Validade: {vencimento}

Aproveite sua conta! Qualquer dúvida, estou à disposição!', true),
  (seller_uuid, 'Premium - Vencimento (3 dias)', 'expiring_3days', 'Olá {nome}! ⏰

Sua conta {conta_premium} vence em *3 dias* ({vencimento}).

💰 Valor: R$ {valor}

Renove agora e continue aproveitando!

PIX: {pix}', true),
  (seller_uuid, 'Premium - Vencimento (2 dias)', 'expiring_2days', 'Olá {nome}! ⏰

Sua conta {conta_premium} vence em *2 dias* ({vencimento}).

💰 Valor: R$ {valor}

Não deixe para última hora!

PIX: {pix}', true),
  (seller_uuid, 'Premium - Vencimento (1 dia)', 'expiring_1day', 'Olá {nome}! 🔔

Sua conta {conta_premium} vence *amanhã* ({vencimento})!

💰 Valor: R$ {valor}

Renove agora para não perder o acesso!

PIX: {pix}', true),
  (seller_uuid, 'Premium - Vencido', 'expired', 'Olá {nome}! ❌

Sua conta {conta_premium} venceu em {vencimento}.

Renove agora e volte a aproveitar!

💰 Valor: R$ {valor}
PIX: {pix}', true),
  (seller_uuid, 'Premium - Cobrança', 'billing', 'Olá {nome}! 💰

Lembrete de pagamento da sua conta {conta_premium}.

📅 Vencimento: {vencimento}
💰 Valor: R$ {valor}

PIX: {pix}

Após o pagamento, envie o comprovante!', true),
  (seller_uuid, 'Premium - Renovação', 'renewal', 'Olá {nome}! ✅

Sua renovação {conta_premium} foi confirmada!

📧 Email: {email_premium}
🔐 Senha: {senha_premium}
📅 Nova validade: {vencimento}

Obrigado pela confiança! 🙏', true),
  (seller_uuid, 'Premium - Credenciais', 'credentials', 'Olá {nome}! 🔐

Aqui estão suas credenciais {conta_premium}:

📧 Email: {email_premium}
🔐 Senha: {senha_premium}

📅 Validade: {vencimento}

Guarde essas informações com segurança!', true),

  -- Telegram Templates - Premium
  (seller_uuid, '[TG] Premium - Boas-vindas', 'welcome', 'Olá {nome}! 🎉

Seja bem-vindo(a) à {empresa}!

Seus dados de acesso {conta_premium}:
📧 Email: `{email_premium}`
🔐 Senha: `{senha_premium}`

📅 Validade: {vencimento}

Aproveite sua conta!', true),
  (seller_uuid, '[TG] Premium - Vencimento (3 dias)', 'expiring_3days', 'Olá {nome}! ⏰

Sua conta {conta_premium} vence em *3 dias* ({vencimento}).

💰 Valor: R$ {valor}

Renove agora!

PIX: `{pix}`', true),
  (seller_uuid, '[TG] Premium - Renovação', 'renewal', 'Olá {nome}! ✅

Sua renovação {conta_premium} foi confirmada!

📧 Email: `{email_premium}`
🔐 Senha: `{senha_premium}`
📅 Nova validade: {vencimento}

Obrigado! 🙏', true),
  (seller_uuid, '[TG] Premium - Credenciais', 'credentials', 'Olá {nome}! 🔐

Credenciais {conta_premium}:

📧 Email: `{email_premium}`
🔐 Senha: `{senha_premium}`

📅 Validade: {vencimento}', true)

  ON CONFLICT DO NOTHING;
END;
$$;