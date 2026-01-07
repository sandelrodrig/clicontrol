-- Add loyalty and referral templates to the default templates function
CREATE OR REPLACE FUNCTION public.create_default_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user already has templates
  IF EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE seller_id = seller_uuid LIMIT 1) THEN
    -- Only add loyalty/referral templates if they don't exist
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE seller_id = seller_uuid AND type = 'loyalty' LIMIT 1) THEN
      INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
      VALUES 
        -- Loyalty Templates (WhatsApp)
        (seller_uuid, 'Agradecimento Especial', 'loyalty', 'Olá, {nome}! 💜

Espero que você esteja bem! Quero agradecer por fazer parte da família *{empresa}*. Clientes como você fazem toda a diferença!

Sua confiança e parceria são muito importantes para mim. É um prazer atender você! 🙏✨

Qualquer coisa que precisar, pode contar comigo!

Um abraço,
*{empresa}*', true),

        (seller_uuid, 'Obrigado pela Renovação', 'loyalty', 'Oi, {nome}! 🌟

Muito obrigado por renovar! É sempre bom saber que você está satisfeito com o serviço.

Sua fidelidade me motiva a continuar oferecendo o melhor atendimento possível! 💪

Conte comigo sempre!
*{empresa}* 🙏', true),

        -- Referral Templates (WhatsApp)
        (seller_uuid, 'Programa de Indicação', 'referral', 'Olá, {nome}! 😊

Tenho um pedido especial: *você está satisfeito(a) com meu serviço?*

Se sim, ficaria muito feliz se pudesse me indicar para amigos, familiares ou colegas! 🙏

📢 *Benefício para você:* Indique e ganhe desconto na próxima renovação!

Basta compartilhar meu contato. Sua indicação vale muito!

Obrigado pela confiança! 💜
*{empresa}*', true),

        (seller_uuid, 'Indicação com Desconto VIP', 'referral', 'Oi, {nome}! 🎁

*Programa VIP de Indicações!*

Para você que já é nosso cliente especial:

✅ Indique *1 amigo* → Ganhe *5% de desconto*
✅ Indique *2 amigos* → Ganhe *10% de desconto*
✅ Indique *3 ou mais* → Ganhe *15% de desconto*

Os descontos são válidos na sua *próxima renovação*!

Interessado? Me conta aqui se conhece alguém que gostaria do serviço! 😉

*{empresa}*', true),

        (seller_uuid, 'Agradecimento + Indicação', 'referral', 'Olá, {nome}! 💝

Quero agradecer por ser meu cliente! Sua satisfação é minha prioridade.

Se o atendimento e o serviço foram bons para você, ficarei muito grato se puder me indicar para pessoas que também possam se beneficiar. 🙏

*Sua indicação me ajuda a crescer e continuar oferecendo qualidade!*

Muito obrigado pela confiança!

Abraços,
*{empresa}* ✨', true),

        -- Telegram versions
        (seller_uuid, '[TG] Agradecimento Especial', 'loyalty', 'Olá, {nome}! 💜

Espero que você esteja bem! Quero agradecer por fazer parte da família {empresa}. Clientes como você fazem toda a diferença!

Sua confiança e parceria são muito importantes para mim. É um prazer atender você! 🙏✨

Qualquer coisa que precisar, pode contar comigo!

Um abraço,
{empresa}', true),

        (seller_uuid, '[TG] Programa de Indicação', 'referral', 'Olá, {nome}! 😊

Tenho um pedido especial: você está satisfeito(a) com meu serviço?

Se sim, ficaria muito feliz se pudesse me indicar para amigos, familiares ou colegas! 🙏

📢 Benefício para você: Indique e ganhe desconto na próxima renovação!

Basta compartilhar meu contato. Sua indicação vale muito!

Obrigado pela confiança! 💜
{empresa}', true);
    END IF;
    RETURN;
  END IF;

  -- Full template creation for new sellers (includes all templates)
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

    -- P2P Templates
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

    -- P2P - Cobrança
    (seller_uuid, 'P2P - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano P2P:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*', true),

    -- Loyalty Templates
    (seller_uuid, 'Agradecimento Especial', 'loyalty', 'Olá, {nome}! 💜

Espero que você esteja bem! Quero agradecer por fazer parte da família *{empresa}*. Clientes como você fazem toda a diferença!

Sua confiança e parceria são muito importantes para mim. É um prazer atender você! 🙏✨

Qualquer coisa que precisar, pode contar comigo!

Um abraço,
*{empresa}*', true),

    (seller_uuid, 'Obrigado pela Renovação', 'loyalty', 'Oi, {nome}! 🌟

Muito obrigado por renovar! É sempre bom saber que você está satisfeito com o serviço.

Sua fidelidade me motiva a continuar oferecendo o melhor atendimento possível! 💪

Conte comigo sempre!
*{empresa}* 🙏', true),

    -- Referral Templates
    (seller_uuid, 'Programa de Indicação', 'referral', 'Olá, {nome}! 😊

Tenho um pedido especial: *você está satisfeito(a) com meu serviço?*

Se sim, ficaria muito feliz se pudesse me indicar para amigos, familiares ou colegas! 🙏

📢 *Benefício para você:* Indique e ganhe desconto na próxima renovação!

Basta compartilhar meu contato. Sua indicação vale muito!

Obrigado pela confiança! 💜
*{empresa}*', true),

    (seller_uuid, 'Indicação com Desconto VIP', 'referral', 'Oi, {nome}! 🎁

*Programa VIP de Indicações!*

Para você que já é nosso cliente especial:

✅ Indique *1 amigo* → Ganhe *5% de desconto*
✅ Indique *2 amigos* → Ganhe *10% de desconto*
✅ Indique *3 ou mais* → Ganhe *15% de desconto*

Os descontos são válidos na sua *próxima renovação*!

Interessado? Me conta aqui se conhece alguém que gostaria do serviço! 😉

*{empresa}*', true),

    (seller_uuid, 'Agradecimento + Indicação', 'referral', 'Olá, {nome}! 💝

Quero agradecer por ser meu cliente! Sua satisfação é minha prioridade.

Se o atendimento e o serviço foram bons para você, ficarei muito grato se puder me indicar para pessoas que também possam se beneficiar. 🙏

*Sua indicação me ajuda a crescer e continuar oferecendo qualidade!*

Muito obrigado pela confiança!

Abraços,
*{empresa}* ✨', true),

    -- Telegram versions
    (seller_uuid, '[TG] Agradecimento Especial', 'loyalty', 'Olá, {nome}! 💜

Espero que você esteja bem! Quero agradecer por fazer parte da família {empresa}. Clientes como você fazem toda a diferença!

Sua confiança e parceria são muito importantes para mim. É um prazer atender você! 🙏✨

Qualquer coisa que precisar, pode contar comigo!

Um abraço,
{empresa}', true),

    (seller_uuid, '[TG] Programa de Indicação', 'referral', 'Olá, {nome}! 😊

Tenho um pedido especial: você está satisfeito(a) com meu serviço?

Se sim, ficaria muito feliz se pudesse me indicar para amigos, familiares ou colegas! 🙏

📢 Benefício para você: Indique e ganhe desconto na próxima renovação!

Basta compartilhar meu contato. Sua indicação vale muito!

Obrigado pela confiança! 💜
{empresa}', true);
END;
$$;