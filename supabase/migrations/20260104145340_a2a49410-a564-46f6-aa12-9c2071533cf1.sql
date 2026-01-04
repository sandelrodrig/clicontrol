-- Fix search_path for normalize_server_name function
CREATE OR REPLACE FUNCTION public.normalize_server_name(name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LOWER(REGEXP_REPLACE(TRIM(name), '\s+', '', 'g'))
$$;

-- Fix search_path for find_server_icon function
CREATE OR REPLACE FUNCTION public.find_server_icon(server_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT icon_url 
  FROM public.default_server_icons 
  WHERE name_normalized = public.normalize_server_name(server_name)
  LIMIT 1
$$;