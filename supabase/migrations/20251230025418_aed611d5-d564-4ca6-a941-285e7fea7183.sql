
-- Create function to create default whatsapp templates for new sellers
CREATE OR REPLACE FUNCTION public.create_default_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- IPTV Templates (WhatsApp)
  INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES 
    -- IPTV - Welcome
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

    -- IPTV - Billing
    (seller_uuid, 'IPTV - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano IPTV:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    -- IPTV - Expiring 3 days
    (seller_uuid, 'IPTV - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano IPTV vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue assistindo sem interrupções! 📺

*{empresa}*', true),

    -- IPTV - Expiring 2 days
    (seller_uuid, 'IPTV - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano IPTV vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem seu entretenimento! Renove agora! 🎬

*{empresa}*', true),

    -- IPTV - Expiring tomorrow
    (seller_uuid, 'IPTV - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano IPTV vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 📺

*{empresa}*', true),

    -- IPTV - Expired
    (seller_uuid, 'IPTV - Vencido', 'expired', '❌ Olá {nome}!

Seu plano IPTV *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a assistir! 📺

*{empresa}*', true),

    -- IPTV - Renewal
    (seller_uuid, 'IPTV - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true),

    -- P2P Templates (WhatsApp)
    -- P2P - Welcome
    (seller_uuid, 'P2P - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso P2P:
📺 *Login:* {login}
🔑 *Senha:* {senha}
📡 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    -- P2P - Billing
    (seller_uuid, 'P2P - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano P2P:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    -- P2P - Expiring 3 days
    (seller_uuid, 'P2P - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Seu plano P2P vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue assistindo sem interrupções! 📺

*{empresa}*', true),

    -- P2P - Expiring 2 days
    (seller_uuid, 'P2P - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Seu plano P2P vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem seu entretenimento! Renove agora! 🎬

*{empresa}*', true),

    -- P2P - Expiring tomorrow
    (seller_uuid, 'P2P - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano P2P vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 📺

*{empresa}*', true),

    -- P2P - Expired
    (seller_uuid, 'P2P - Vencido', 'expired', '❌ Olá {nome}!

Seu plano P2P *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a assistir! 📺

*{empresa}*', true),

    -- P2P - Renewal
    (seller_uuid, 'P2P - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*', true)

  ON CONFLICT DO NOTHING;
END;
$$;

-- Update handle_new_user to also create default templates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Criar profile com WhatsApp
  INSERT INTO public.profiles (id, email, full_name, whatsapp, subscription_expires_at, is_permanent)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'whatsapp',
    NOW() + INTERVAL '5 days',
    false
  );

  -- Verificar se é o primeiro usuário
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    -- Primeiro usuário é admin permanente
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    UPDATE public.profiles SET is_permanent = true WHERE id = NEW.id;
  ELSE
    -- Demais usuários são sellers
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller');
    -- Create default plans for new seller
    PERFORM create_default_plans_for_seller(NEW.id);
    -- Create default whatsapp templates for new seller
    PERFORM create_default_templates_for_seller(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
