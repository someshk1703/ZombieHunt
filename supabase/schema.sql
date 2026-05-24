-- =============================================================
-- ZOMBIE HUNT — Supabase Schema
-- =============================================================
-- Card object structure (stored in JSONB hand/committed_cards):
-- {
--   "id":    "uuid-v4",
--   "type":  "number" | "zombie" | "shotgun" | "vaccine",
--   "value": 2–14 (number cards), 15 (zombie), 0 (shotgun/vaccine),
--   "suit":  "spades" | "hearts" | "diamonds" | "clubs" | null,
--   "used":  false
-- }
-- =============================================================

-- ── 1. ROOMS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL,
  host_id    UUID NOT NULL,
  status     TEXT DEFAULT 'lobby'
               CHECK (status IN ('lobby','playing','finished')),
  settings   JSONB DEFAULT '{
    "max_players": 10,
    "round_timer_seconds": 20,
    "max_lives": 3,
    "reveal_infection_after": 2,
    "auto_reveal_infection": false
  }',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. PLAYERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  username         TEXT NOT NULL,
  avatar_url       TEXT NOT NULL,
  status           TEXT DEFAULT 'alive'
                     CHECK (status IN ('alive','infected','eliminated','ghost')),
  lives            INT DEFAULT 3,
  hand             JSONB DEFAULT '[]',
  infection_rounds INT DEFAULT 0,
  infector_id      UUID,
  is_ready         BOOLEAN DEFAULT false,
  is_host          BOOLEAN DEFAULT false,
  score            INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── 3. GAME STATE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
  round_number    INT DEFAULT 1,
  phase           TEXT DEFAULT 'deal'
                    CHECK (phase IN ('deal','hand_review','blind_action','reveal','elimination_check','finished')),
  pairs           JSONB DEFAULT '[]',
  bye_player_id   UUID,
  committed_cards JSONB DEFAULT '{}',
  phase_deadline  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 4. ROUND LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number  INT NOT NULL,
  player_id     UUID REFERENCES players(id),
  opponent_id   UUID REFERENCES players(id),
  cards_played  JSONB,
  outcome       TEXT,
  special_event TEXT,
  card_stolen   JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 5. MATCHMAKING QUEUE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE,
  username   TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 6. ROOM CHAT ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_chat (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  username   TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================

-- 1. generate_room_code() → 6-char uppercase, excludes 0/O/I/1
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT;
  done  BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Retry if collision
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.code = code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 2. get_my_committed_cards(p_room_id) → JSONB (caller's cards only)
CREATE OR REPLACE FUNCTION get_my_committed_cards(p_room_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(
      committed_cards -> (auth.uid()::text),
      '[]'::jsonb
    )
  FROM game_state
  WHERE room_id = p_room_id;
$$;

-- 3. get_player_infection_status(p_player_id) → JSONB
--    Full data only if caller is the player themselves.
--    Public: { infected: bool } after incubation period (infection_rounds > 1)
CREATE OR REPLACE FUNCTION get_player_infection_status(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p players%ROWTYPE;
BEGIN
  SELECT * INTO p FROM players WHERE id = p_player_id;

  -- Full data for the player themselves
  IF auth.uid() = p.user_id THEN
    RETURN jsonb_build_object(
      'infected',          p.status IN ('infected'),
      'infection_rounds',  p.infection_rounds,
      'infector_id',       p.infector_id
    );
  END IF;

  -- Public only after incubation period
  IF p.infection_rounds > 1 THEN
    RETURN jsonb_build_object('infected', p.status IN ('infected'));
  END IF;

  RETURN jsonb_build_object('infected', false);
END;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state        ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_chat         ENABLE ROW LEVEL SECURITY;

-- ── ROOMS ────────────────────────────────────────────────────
CREATE POLICY "rooms_select_all" ON rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rooms_insert_auth" ON rooms
  FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());

CREATE POLICY "rooms_update_host" ON rooms
  FOR UPDATE TO authenticated USING (host_id = auth.uid());

-- ── PLAYERS — SELECT ─────────────────────────────────────────
-- Public columns: any player in same room can see general info
CREATE POLICY "players_select_public" ON players
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT p2.room_id FROM players p2 WHERE p2.user_id = auth.uid()
    )
  );

-- ── PLAYERS — INSERT / UPDATE ────────────────────────────────
CREATE POLICY "players_insert_self" ON players
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_update_self" ON players
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── GAME STATE ───────────────────────────────────────────────
-- Any room member can read general columns (committed_cards filtered via function)
CREATE POLICY "game_state_select_members" ON game_state
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT p.room_id FROM players p WHERE p.user_id = auth.uid()
    )
  );

-- Only service role (edge functions) can write game_state
CREATE POLICY "game_state_insert_service" ON game_state
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "game_state_update_service" ON game_state
  FOR UPDATE TO service_role USING (true);

-- ── ROUND LOG ────────────────────────────────────────────────
-- Players can read log for their room (after reveal phase)
CREATE POLICY "round_log_select_members" ON round_log
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT p.room_id FROM players p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "round_log_insert_service" ON round_log
  FOR INSERT TO service_role WITH CHECK (true);

-- ── MATCHMAKING QUEUE ────────────────────────────────────────
CREATE POLICY "queue_select_auth" ON matchmaking_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "queue_insert_self" ON matchmaking_queue
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "queue_delete_self" ON matchmaking_queue
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── ROOM CHAT ────────────────────────────────────────────────
CREATE POLICY "chat_select_members" ON room_chat
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT p.room_id FROM players p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_insert_self" ON room_chat
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================
-- REALTIME
-- =============================================================
-- Enable Realtime on public columns (run in Supabase dashboard
-- or via supabase CLI: supabase db push)
--
-- Tables to enable: rooms, players, game_state, round_log, room_chat
--
-- Private columns excluded from realtime:
--   players.hand, players.infector_id, players.infection_rounds
--   game_state.committed_cards
