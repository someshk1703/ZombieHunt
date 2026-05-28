-- Migration for resolve-round complete rewrite
-- Ensures all columns written by the new resolve-round function exist.

-- infector_id and score are in schema.sql but were missing from migrations
ALTER TABLE players ADD COLUMN IF NOT EXISTS infector_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;

-- Stat columns (should exist from prompt7, guard with IF NOT EXISTS)
ALTER TABLE players ADD COLUMN IF NOT EXISTS infections_caused INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS cards_stolen INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS special_cards_played INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rounds_survived INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS elimination_round INT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS elimination_cause TEXT;

-- round_log outcomes column (should exist from 20260527, guard with IF NOT EXISTS)
ALTER TABLE round_log ADD COLUMN IF NOT EXISTS outcomes JSONB DEFAULT '[]'::jsonb;

-- game_state negotiation_deadline (needed for round transitions)
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS negotiation_deadline TIMESTAMPTZ;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- game_state winner columns (should exist from prompt7, guard with IF NOT EXISTS)
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS winner_faction TEXT
  CHECK (winner_faction IN ('humans', 'zombies'));
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS winner_player_id UUID;
