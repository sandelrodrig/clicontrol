-- Function to create default plans for a seller
CREATE OR REPLACE FUNCTION public.create_default_plans_for_seller(seller_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- IPTV Plans
  INSERT INTO public.plans (seller_id, name, price, duration_days, category, is_active)
  VALUES 
    (seller_uuid, 'IPTV Mensal', 0, 30, 'IPTV', true),
    (seller_uuid, 'IPTV Trimestral', 0, 90, 'IPTV', true),
    (seller_uuid, 'IPTV Semestral', 0, 180, 'IPTV', true),
    (seller_uuid, 'IPTV Anual', 0, 365, 'IPTV', true),
    -- SSH Plans
    (seller_uuid, 'SSH Mensal', 0, 30, 'SSH', true),
    (seller_uuid, 'SSH Trimestral', 0, 90, 'SSH', true),
    (seller_uuid, 'SSH Semestral', 0, 180, 'SSH', true),
    (seller_uuid, 'SSH Anual', 0, 365, 'SSH', true),
    -- P2P Plans
    (seller_uuid, 'P2P Mensal', 0, 30, 'P2P', true),
    (seller_uuid, 'P2P Trimestral', 0, 90, 'P2P', true),
    (seller_uuid, 'P2P Semestral', 0, 180, 'P2P', true),
    (seller_uuid, 'P2P Anual', 0, 365, 'P2P', true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Update handle_new_user to create default plans for new sellers
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
  END IF;

  RETURN NEW;
END;
$$;