-- Prompt 6 migration: duel_chat + is_bot + negotiation settings

-- Duel chat table
CREATE TABLE IF NOT EXISTS duel_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  player_a_id UUID NOT NULL,
  player_b_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE duel_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Duel participants can read" ON duel_chat
  FOR SELECT USING (
    auth.uid() = player_a_id OR auth.uid() = player_b_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.room_id = duel_chat.room_id
        AND players.user_id = auth.uid()
        AND players.status = 'eliminated'
    )
  );

CREATE POLICY "Duel participants can insert" ON duel_chat
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (auth.uid() = player_a_id OR auth.uid() = player_b_id)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE duel_chat;

-- Add is_bot column to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Add negotiation_timer_seconds to game_state
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS negotiation_deadline TIMESTAMPTZ;

-- commit_cards RPC function
CREATE OR REPLACE FUNCTION commit_cards(
  p_room_id UUID,
  p_cards JSONB
) RETURNS void AS $$
DECLARE
  current_committed JSONB;
BEGIN
  SELECT committed_cards INTO current_committed
  FROM game_state WHERE room_id = p_room_id;

  UPDATE game_state
  SET committed_cards = COALESCE(current_committed, '{}'::jsonb) ||
      jsonb_build_object(auth.uid()::text, p_cards),
      updated_at = now()
  WHERE room_id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
