-- Add second server fields to clients table
ALTER TABLE public.clients 
ADD COLUMN server_id_2 uuid NULL,
ADD COLUMN server_name_2 text NULL,
ADD COLUMN login_2 text NULL,
ADD COLUMN password_2 text NULL;