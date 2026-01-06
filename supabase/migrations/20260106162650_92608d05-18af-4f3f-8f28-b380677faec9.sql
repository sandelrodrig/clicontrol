-- Insert app theme setting for global theme configuration
INSERT INTO public.app_settings (key, value, description)
VALUES ('app_theme', 'netflix', 'Tema global do aplicativo (netflix, neon-blue, emerald, purple, orange)')
ON CONFLICT (key) DO NOTHING;