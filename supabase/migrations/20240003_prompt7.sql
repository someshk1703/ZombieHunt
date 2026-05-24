-- Prompt 7 migration: game_events + player stat columns + game_state win columns

CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'infection', 'elimination', 'vaccine_used', 'shotgun_fired',
      'card_stolen', 'zombie_played', 'subject_zero_win',
      'game_start', 'game_end'
    )),
  actor_id UUID,
  target_id UUID,
  actor_username TEXT,
  target_username TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read game_events after game ends" ON game_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN game_state gs ON gs.room_id = game_events.room_id
      WHERE p.room_id = game_events.room_id
        AND p.user_id = auth.uid()
        AND (gs.phase = 'finished' OR p.status = 'eliminated')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE game_events;

-- Player stat columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS elimination_round INT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS elimination_cause TEXT
  CHECK (elimination_cause IN ('shotgun', 'infection', null));
ALTER TABLE players ADD COLUMN IF NOT EXISTS infections_caused INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS cards_stolen INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS special_cards_played INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rounds_survived INT DEFAULT 0;

-- game_state win columns
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS winner_faction TEXT
  CHECK (winner_faction IN ('humans', 'zombies', null));
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS winner_player_id UUID;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS reveal_sequence JSONB;

-- Ghost chat type in room_chat
ALTER TABLE room_chat DROP CONSTRAINT IF EXISTS room_chat_type_check;
ALTER TABLE room_chat ADD CONSTRAINT room_chat_type_check
  CHECK (type IN ('message', 'system', 'ghost'));
