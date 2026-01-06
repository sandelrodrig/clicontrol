-- Fix login_attempts RLS policies - remove overly permissive policy
-- Drop the existing overly permissive policy that allows public access
DROP POLICY IF EXISTS "Service role can manage login_attempts" ON public.login_attempts;

-- No new policies needed - service role bypasses RLS by default
-- Regular users should NOT have any access to this table
-- The table is only accessed by edge functions using service role key