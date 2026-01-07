-- Add trial days setting
INSERT INTO public.app_settings (key, value, description)
VALUES ('seller_trial_days', '5', 'Dias de teste para novos revendedores')
ON CONFLICT (key) DO NOTHING;

-- Update the handle_new_user function to use dynamic trial days
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  trial_days INTEGER;
BEGIN
  -- Get trial days from settings (default 5 if not found)
  SELECT COALESCE(NULLIF(value, '')::integer, 5) INTO trial_days
  FROM public.app_settings
  WHERE key = 'seller_trial_days';
  
  IF trial_days IS NULL THEN
    trial_days := 5;
  END IF;

  -- Criar profile com WhatsApp
  INSERT INTO public.profiles (id, email, full_name, whatsapp, subscription_expires_at, is_permanent)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'whatsapp',
    NOW() + (trial_days || ' days')::interval,
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
$function$;