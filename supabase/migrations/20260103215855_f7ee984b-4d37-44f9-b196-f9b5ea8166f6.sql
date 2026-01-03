-- Add tutorial_visto column to profiles table for new seller onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_visto boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.tutorial_visto IS 'Flag indicating if seller has completed the onboarding tutorial';