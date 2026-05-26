-- Add 'discussion' to the game_state phase CHECK constraint
-- and add the discussion_started_at column

-- Drop old inline check constraint (auto-named by Postgres)
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_phase_check;

-- Re-add with 'discussion' included
ALTER TABLE game_state
  ADD CONSTRAINT game_state_phase_check
  CHECK (phase IN (
    'deal', 'hand_review', 'blind_action',
    'reveal', 'elimination_check', 'discussion', 'finished'
  ));

-- Add discussion timer column
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS discussion_started_at TIMESTAMPTZ;
