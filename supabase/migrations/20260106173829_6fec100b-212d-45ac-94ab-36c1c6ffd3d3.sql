-- Fix push_subscriptions RLS policies - remove overly permissive policy
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.push_subscriptions;

-- The existing user-specific policies are correct:
-- "Users can view their own subscriptions" - SELECT where auth.uid() = user_id
-- "Users can insert their own subscriptions" - INSERT with check auth.uid() = user_id  
-- "Users can delete their own subscriptions" - DELETE where auth.uid() = user_id

-- Add UPDATE policy for users to update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);