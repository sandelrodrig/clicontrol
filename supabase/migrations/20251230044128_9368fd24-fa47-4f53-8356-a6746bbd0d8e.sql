-- Allow Admins to import/create clients for any seller (fixes 403/RLS "erro de segurança" during admin import)

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Admins can insert clients'
  ) THEN
    CREATE POLICY "Admins can insert clients"
    ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;