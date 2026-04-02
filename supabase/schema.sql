-- ============================================================
-- TekaPoker — Supabase Schema
-- Paste this into the Supabase SQL Editor and click "Run"
-- ============================================================

-- Jugadores registrados permanentemente en la app
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT '#4ade80',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cada sesión de poker jugada
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  played_at TIMESTAMPTZ DEFAULT now(),
  buy_in NUMERIC NOT NULL,
  total_players INTEGER NOT NULL,
  notes TEXT
);

-- Resultado de cada jugador en una partida
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  points NUMERIC NOT NULL,
  final_money NUMERIC NOT NULL,
  net NUMERIC NOT NULL
);

-- Pagos para liquidar cada partida
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  from_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  to_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL
);
