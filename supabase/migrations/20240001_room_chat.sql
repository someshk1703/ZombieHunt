-- room_chat table for lobby messaging, reactions, and system events
CREATE TABLE IF NOT EXISTS room_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  message TEXT,
  reaction TEXT,
  type TEXT DEFAULT 'message'
    CHECK (type IN ('message', 'reaction', 'system')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE room_chat ENABLE ROW LEVEL SECURITY;

-- SELECT: any player in the room can read
CREATE POLICY "room_chat_select" ON room_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.room_id = room_chat.room_id
        AND players.user_id = auth.uid()
    )
  );

-- INSERT: authenticated users can insert their own messages
CREATE POLICY "room_chat_insert" ON room_chat
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE room_chat;
