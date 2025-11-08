
-- Migration: 20251107223911

-- Migration: 20251107221348

-- Migration: 20251107220325

-- Migration: 20251107213359

-- Migration: 20251107211150

-- Migration: 20251107210223

-- Migration: 20251107204947
-- Criar tabela de jogos
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_datetime TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de odds
CREATE TABLE public.odds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  bookmaker TEXT NOT NULL,
  home_odd NUMERIC NOT NULL,
  away_odd NUMERIC NOT NULL,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, bookmaker)
);

-- Índices para performance
CREATE INDEX idx_games_datetime ON public.games(game_datetime);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_odds_game_id ON public.odds(game_id);

-- Habilitar RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (MVP sem autenticação)
CREATE POLICY "Permitir leitura pública de jogos"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "Permitir leitura pública de odds"
  ON public.odds FOR SELECT
  USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251107205009
-- Corrigir search_path para a função update_updated_at_column
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

-- Recriar trigger
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();




-- Migration: 20251107214034
-- Criar tabela de status de sincronização
CREATE TABLE public.sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sport_key TEXT NOT NULL DEFAULT 'basketball_nba',
  CONSTRAINT single_row CHECK (id = 1)
);

-- Inserir registro inicial
INSERT INTO public.sync_status (id, last_run_at, sport_key) 
VALUES (1, now(), 'basketball_nba');

-- Habilitar RLS
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de sync_status"
  ON public.sync_status FOR SELECT
  USING (true);

-- Criar tabela de log de arbitragens
CREATE TABLE public.arbitrage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT NOT NULL,
  bookmaker_a TEXT NOT NULL,
  bookmaker_b TEXT NOT NULL,
  odd_a NUMERIC NOT NULL,
  odd_b NUMERIC NOT NULL,
  arb_index NUMERIC NOT NULL,
  profit_percent NUMERIC NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_arbitrage_log_detected_at ON public.arbitrage_log(detected_at DESC);
CREATE INDEX idx_arbitrage_log_game_id ON public.arbitrage_log(game_id);
CREATE INDEX idx_arbitrage_log_sport ON public.arbitrage_log(sport);

-- Habilitar RLS
ALTER TABLE public.arbitrage_log ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de arbitrage_log"
  ON public.arbitrage_log FOR SELECT
  USING (true);



