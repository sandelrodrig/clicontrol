-- Create function to generate admin-specific templates for managing sellers
CREATE OR REPLACE FUNCTION public.create_admin_templates(admin_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin templates for managing SELLERS (WhatsApp only)
  INSERT INTO public.whatsapp_templates (seller_id, name, type, message, is_default)
  VALUES 
    -- Vendedores - WhatsApp
    (admin_uuid, 'Vendedor - Boas-vindas', 'welcome', '👋 Olá {nome}!

Seja bem-vindo(a) ao nosso sistema de revenda! 🎉

📧 *Email:* {email}
📱 *WhatsApp:* {whatsapp}
📅 *Vencimento:* {vencimento}
💰 *Mensalidade:* R$ 25,00

Qualquer dúvida estamos à disposição! 🙏', true),

    (admin_uuid, 'Vendedor - Cobrança', 'billing', '💰 Olá {nome}!

Estamos enviando os dados para pagamento da sua mensalidade:

💵 *Valor:* R$ 25,00
📆 *Vencimento:* {vencimento}

*Chave PIX:* {pix}

Após o pagamento, envie o comprovante! ✅', true),

    (admin_uuid, 'Vendedor - Vencendo em 3 dias', 'expiring_3days', '⏰ Olá {nome}!

Sua assinatura do sistema vence em *3 dias* ({vencimento}).

💰 *Valor para renovação:* R$ 25,00

Renove agora e continue usando o sistema! 💼', true),

    (admin_uuid, 'Vendedor - Vencendo em 2 dias', 'expiring_2days', '⚠️ Olá {nome}!

Sua assinatura vence em *2 dias* ({vencimento}).

💰 *Valor:* R$ 25,00

Não perca seu acesso! Renove agora! 📱', true),

    (admin_uuid, 'Vendedor - Vencendo amanhã', 'expiring_1day', '🔔 Olá {nome}!

⚡ *ATENÇÃO!* Sua assinatura vence *AMANHÃ* ({vencimento})!

💰 *Valor:* R$ 25,00

Renove agora para não perder o acesso ao sistema! ⏳', true),

    (admin_uuid, 'Vendedor - Vencido', 'expired', '❌ Olá {nome}!

Sua assinatura *venceu* em {vencimento}.

💰 *Valor para renovação:* R$ 25,00

Entre em contato para renovar e voltar a usar o sistema! 💼', true),

    (admin_uuid, 'Vendedor - Renovação Confirmada', 'renewal', '✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📆 *Novo vencimento:* {vencimento}

Obrigado por continuar conosco! 🙏', true)

  ON CONFLICT DO NOTHING;
END;
$function$;