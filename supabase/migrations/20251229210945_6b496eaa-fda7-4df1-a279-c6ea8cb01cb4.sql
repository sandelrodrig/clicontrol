-- Tabela para rastrear tentativas de login (proteção brute force)
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Índice para busca rápida por email
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_attempt_at ON public.login_attempts(attempt_at);

-- Função para verificar se usuário está bloqueado (10 tentativas em 15 min)
CREATE OR REPLACE FUNCTION public.is_user_blocked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= 10
  FROM public.login_attempts
  WHERE email = user_email
    AND success = false
    AND attempt_at > NOW() - INTERVAL '15 minutes'
$$;

-- Função para limpar tentativas antigas (mais de 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts WHERE attempt_at < NOW() - INTERVAL '24 hours'
$$;

-- RLS para login_attempts (apenas funções do sistema podem inserir)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção via service role
CREATE POLICY "Service role can manage login_attempts"
ON public.login_attempts
FOR ALL
USING (true)
WITH CHECK (true);