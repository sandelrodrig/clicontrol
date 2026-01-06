-- Enable realtime for app_settings to sync theme across all users
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;