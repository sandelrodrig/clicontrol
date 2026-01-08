-- Create default templates function for panel resellers (using text type since template_type enum doesn't exist)
CREATE OR REPLACE FUNCTION public.create_panel_reseller_templates_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES 
    (seller_uuid, 'Revendedor Painel - Boas-vindas', 'panel_reseller_welcome', '👋 Olá {nome}!

Seja bem-vindo(a) como revendedor! 🎉

Seus dados de acesso ao painel:
📡 *Servidor:* {servidor}
👤 *Login:* {login}
🔑 *Senha:* {senha}
💎 *Créditos:* {creditos}

📅 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏', true),

    (seller_uuid, 'Revendedor Painel - Cobrança', 'panel_reseller_billing', '💰 Olá {nome}!

Estamos enviando os dados para renovação da sua revenda:

📡 *Servidor:* {servidor}
💎 *Créditos:* {creditos}
📆 *Vencimento:* {vencimento}

*Chave PIX:* {pix}

Após o pagamento, envie o comprovante! ✅', true),

    (seller_uuid, 'Revendedor Painel - Vencendo em 3 dias', 'panel_reseller_expiring_3days', '⏰ Olá {nome}!

Sua revenda do painel *{servidor}* vence em *3 dias* ({vencimento}).

💎 *Créditos atuais:* {creditos}

Renove agora e continue revendendo! 💼', true),

    (seller_uuid, 'Revendedor Painel - Vencendo em 2 dias', 'panel_reseller_expiring_2days', '⚠️ Olá {nome}!

Sua revenda do painel *{servidor}* vence em *2 dias* ({vencimento}).

💎 *Créditos atuais:* {creditos}

Não deixe para última hora! Renove agora! 📱', true),

    (seller_uuid, 'Revendedor Painel - Vencendo amanhã', 'panel_reseller_expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Sua revenda do painel *{servidor}* vence *AMANHÃ* ({vencimento})!

💎 *Créditos atuais:* {creditos}

Renove agora para não perder o acesso! ⏳', true),

    (seller_uuid, 'Revendedor Painel - Vencido', 'panel_reseller_expired', '❌ Olá {nome}!

Sua revenda do painel *{servidor}* *venceu* em {vencimento}.

Entre em contato para renovar e voltar a revender! 💼', true),

    (seller_uuid, 'Revendedor Painel - Renovação', 'panel_reseller_renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📡 *Servidor:* {servidor}
📆 *Novo vencimento:* {vencimento}
💎 *Créditos:* {creditos}

Obrigado por continuar conosco! 🙏', true),

    (seller_uuid, 'Revendedor Painel - Credenciais', 'panel_reseller_credentials', '🔐 Olá {nome}!

Suas credenciais de revendedor:

📡 *Servidor:* {servidor}
👤 *Login:* {login}
🔑 *Senha:* {senha}
💎 *Créditos:* {creditos}

📅 *Vencimento:* {vencimento}

Guarde essas informações com segurança!', true)

  ON CONFLICT DO NOTHING;
END;
$$;