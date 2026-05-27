-- Strict rules compatibility migration
-- Ensures schema supports current strict game logic and edge-function writes.

-- 1) game_state phase and timing support
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_phase_check;
ALTER TABLE game_state
  ADD CONSTRAINT game_state_phase_check
  CHECK (phase IN (
    'deal', 'hand_review', 'blind_action',
    'reveal', 'elimination_check', 'discussion', 'finished'
  ));

ALTER TABLE game_state ADD COLUMN IF NOT EXISTS discussion_started_at TIMESTAMPTZ;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS negotiation_deadline TIMESTAMPTZ;

-- 2) round_log storage used by resolve-round/results
ALTER TABLE round_log ADD COLUMN IF NOT EXISTS outcomes JSONB;

-- 3) elimination cause compatibility
-- resolve-round can emit: shotgun, infection, no_cards
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_elimination_cause_check;
ALTER TABLE players
  ADD CONSTRAINT players_elimination_cause_check
  CHECK (
    elimination_cause IS NULL OR elimination_cause IN ('shotgun', 'infection', 'no_cards')
  );
