-- Add round_schedule and total_rounds to game_state for true round-robin scheduling.
-- round_schedule: pre-computed array of rounds, each round is an array of [playerA_id, playerB_id] pairs.
-- total_rounds: total number of rounds for this game (n-1 for even player count, n for odd).
ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS round_schedule JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS total_rounds   INT  DEFAULT 0;
