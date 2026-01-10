-- Fix login_attempts RLS - needs policies for the brute force check edge function
-- This table is accessed by edge functions with service role, but we need basic policies

-- Policy to allow inserts (service role will bypass RLS, but this is for safety)
CREATE POLICY "Allow service to insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy to allow reads for checking attempts (service role bypasses RLS anyway)
CREATE POLICY "Allow service to read login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy to allow deletes for cleanup
CREATE POLICY "Allow service to delete login attempts"
ON public.login_attempts
FOR DELETE
TO authenticated, anon
USING (true);