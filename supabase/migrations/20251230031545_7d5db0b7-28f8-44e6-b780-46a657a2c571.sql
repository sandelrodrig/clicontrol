-- Drop the public read policy
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;

-- Create policy for authenticated users only
CREATE POLICY "Authenticated users can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);