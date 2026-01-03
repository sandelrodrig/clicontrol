-- Add expiration_date field to client_external_apps table
ALTER TABLE public.client_external_apps
ADD COLUMN expiration_date date;