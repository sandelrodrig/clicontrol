-- Create table for default server icons (managed by admin)
CREATE TABLE public.default_server_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on normalized name
CREATE UNIQUE INDEX idx_default_server_icons_name ON public.default_server_icons(name_normalized);

-- Enable RLS
ALTER TABLE public.default_server_icons ENABLE ROW LEVEL SECURITY;

-- Everyone can read default icons
CREATE POLICY "Anyone can view default server icons" 
ON public.default_server_icons 
FOR SELECT 
USING (true);

-- Only admins can manage icons
CREATE POLICY "Admins can insert default server icons" 
ON public.default_server_icons 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update default server icons" 
ON public.default_server_icons 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete default server icons" 
ON public.default_server_icons 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_default_server_icons_updated_at
BEFORE UPDATE ON public.default_server_icons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to normalize server names for matching
CREATE OR REPLACE FUNCTION public.normalize_server_name(name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(REGEXP_REPLACE(TRIM(name), '\s+', '', 'g'))
$$;

-- Function to find matching icon for a server name
CREATE OR REPLACE FUNCTION public.find_server_icon(server_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT icon_url 
  FROM public.default_server_icons 
  WHERE name_normalized = public.normalize_server_name(server_name)
  LIMIT 1
$$;

-- Trigger to auto-set icon_url when creating/updating servers
CREATE OR REPLACE FUNCTION public.auto_set_server_icon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_icon TEXT;
BEGIN
  -- Only auto-set if icon_url is null or empty
  IF NEW.icon_url IS NULL OR NEW.icon_url = '' THEN
    default_icon := public.find_server_icon(NEW.name);
    IF default_icon IS NOT NULL THEN
      NEW.icon_url := default_icon;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_server_icon_trigger
BEFORE INSERT OR UPDATE ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_server_icon();

-- Insert STAR PLAY icon as first default
INSERT INTO public.default_server_icons (name, name_normalized, icon_url)
VALUES ('STAR PLAY', 'starplay', '/images/servers/starplay.jpeg');