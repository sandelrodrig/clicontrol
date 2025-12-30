-- Update the function to include P2P templates
CREATE OR REPLACE FUNCTION public.create_default_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- IPTV Templates (WhatsApp)
  INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES 
    -- IPTV - WhatsApp
    (seller_uuid, 'IPTV - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso IPTV:
📺 *Login:* {login}
🔑 *Senha:* {senha}
📡 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, 'IPTV - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano IPTV:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, 'IPTV - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano IPTV vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue assistindo sem interrupções! 📺

*{empresa}*', true),

    (seller_uuid, 'IPTV - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano IPTV vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem seu entretenimento! Renove agora! 🎬

*{empresa}*', true),

    (seller_uuid, 'IPTV - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano IPTV vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 📺

*{empresa}*', true),

    (seller_uuid, 'IPTV - Vencido', 'expired', '❌ Olá {nome}!

Seu plano IPTV *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a assistir! 📺

*{empresa}*', true),

    (seller_uuid, 'IPTV - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- IPTV - Telegram
    (seller_uuid, '[TG] IPTV - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso IPTV:
📺 *Login:* {login}
🔑 *Senha:* {senha}
📡 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, '[TG] IPTV - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano IPTV:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* `{pix}`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, '[TG] IPTV - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano IPTV vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Renove agora e continue assistindo sem interrupções! 📺

*{empresa}*', true),

    (seller_uuid, '[TG] IPTV - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano IPTV vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Não fique sem seu entretenimento! Renove agora! 🎬

*{empresa}*', true),

    (seller_uuid, '[TG] IPTV - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano IPTV vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Renove agora para não perder o acesso! 📺

*{empresa}*', true),

    (seller_uuid, '[TG] IPTV - Vencido', 'expired', '❌ Olá {nome}!

Seu plano IPTV *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Entre em contato para renovar e voltar a assistir! 📺

*{empresa}*', true),

    (seller_uuid, '[TG] IPTV - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- P2P - WhatsApp
    (seller_uuid, 'P2P - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso P2P:
👤 *Login:* {login}
🔑 *Senha:* {senha}
🌐 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, 'P2P - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano P2P:

🌐 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, 'P2P - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano P2P vence em *3 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue navegando sem interrupções! 🌐

*{empresa}*', true),

    (seller_uuid, 'P2P - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano P2P vence em *2 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem internet! Renove agora! 📶

*{empresa}*', true),

    (seller_uuid, 'P2P - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano P2P vence *AMANHÃ* ({vencimento})!

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 📶

*{empresa}*', true),

    (seller_uuid, 'P2P - Vencido', 'expired', '❌ Olá {nome}!

Seu plano P2P *venceu* em {vencimento}.

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a navegar! 🌐

*{empresa}*', true),

    (seller_uuid, 'P2P - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

🌐 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
👤 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- P2P - Telegram
    (seller_uuid, '[TG] P2P - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso P2P:
👤 *Login:* {login}
🔑 *Senha:* {senha}
🌐 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, '[TG] P2P - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano P2P:

🌐 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* `{pix}`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, '[TG] P2P - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano P2P vence em *3 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Renove agora e continue navegando sem interrupções! 🌐

*{empresa}*', true),

    (seller_uuid, '[TG] P2P - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano P2P vence em *2 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Não fique sem internet! Renove agora! 📶

*{empresa}*', true),

    (seller_uuid, '[TG] P2P - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano P2P vence *AMANHÃ* ({vencimento})!

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Renove agora para não perder o acesso! 📶

*{empresa}*', true),

    (seller_uuid, '[TG] P2P - Vencido', 'expired', '❌ Olá {nome}!

Seu plano P2P *venceu* em {vencimento}.

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

*Chave PIX:* `{pix}`

Entre em contato para renovar e voltar a navegar! 🌐

*{empresa}*', true),

    (seller_uuid, '[TG] P2P - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

🌐 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
👤 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- SSH - WhatsApp
    (seller_uuid, 'SSH - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso SSH:
👤 *Login:* {login}
🔑 *Senha:* {senha}
🌐 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, 'SSH - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano SSH:

🌐 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, 'SSH - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

🌐 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
👤 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- Contas Premium - WhatsApp
    (seller_uuid, 'Premium - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso Premium:
📧 *Email:* {email}
🔑 *Senha:* {senha_premium}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, 'Premium - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento da sua conta Premium:

⭐ *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    (seller_uuid, 'Premium - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Sua conta Premium vence em *3 dias* ({vencimento}).

⭐ *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue aproveitando! ⭐

*{empresa}*', true),

    (seller_uuid, 'Premium - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Sua conta Premium vence em *2 dias* ({vencimento}).

⭐ *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não perca seu acesso! Renove agora! ⭐

*{empresa}*', true),

    (seller_uuid, 'Premium - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Sua conta Premium vence *AMANHÃ* ({vencimento})!

⭐ *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! ⭐

*{empresa}*', true),

    (seller_uuid, 'Premium - Vencido', 'expired', '❌ Olá {nome}!

Sua conta Premium *venceu* em {vencimento}.

⭐ *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar! ⭐

*{empresa}*', true),

    (seller_uuid, 'Premium - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

⭐ *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
📧 *Email:* {email}
🔐 *Senha:* {senha_premium}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- Premium - Telegram
    (seller_uuid, '[TG] Premium - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso Premium:
📧 *Email:* {email}
🔑 *Senha:* {senha_premium}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, '[TG] Premium - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento da sua conta Premium:

⭐ *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* `{pix}`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true)

  ON CONFLICT DO NOTHING;
END;
$$;