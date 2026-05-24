-- ============================================================
-- BASE SCHEMA — Prompt 1
-- Core tables: rooms, players, game_state, round_log,
--              matchmaking_queue
-- ============================================================

-- ── ROOMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  host_id     UUID NOT NULL,
  status      TEXT NOT NULL DEFAULT 'lobby'
                CHECK (status IN ('lobby', 'playing', 'finished')),
  settings    JSONB NOT NULL DEFAULT '{
    "max_players": 6,
    "round_timer_seconds": 30,
    "negotiation_timer_seconds": 60,
    "allow_spectators": false,
    "infection_visibility": false,
    "visibility": "public"
  }'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_all"  ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_auth" ON rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update_host" ON rooms FOR UPDATE USING (auth.uid() = host_id);

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- ── PLAYERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL,
  username            TEXT NOT NULL,
  avatar_url          TEXT NOT NULL DEFAULT '',
  is_host             BOOLEAN NOT NULL DEFAULT false,
  is_ready            BOOLEAN NOT NULL DEFAULT false,
  is_bot              BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL DEFAULT 'alive'
                        CHECK (status IN ('alive', 'infected', 'eliminated')),
  lives               INT NOT NULL DEFAULT 1,
  hand                JSONB NOT NULL DEFAULT '[]'::jsonb,
  infection_rounds    INT NOT NULL DEFAULT 0,
  -- Stats (populated during/after game)
  elimination_round   INT,
  elimination_cause   TEXT,
  infections_caused   INT NOT NULL DEFAULT 0,
  cards_stolen        INT NOT NULL DEFAULT 0,
  special_cards_played INT NOT NULL DEFAULT 0,
  rounds_survived     INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_room" ON players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rooms WHERE rooms.id = players.room_id)
  );

CREATE POLICY "players_insert_auth" ON players
  FOR INSERT WITH CHECK (user_id = auth.uid() OR is_bot = true);

CREATE POLICY "players_update_own" ON players
  FOR UPDATE USING (user_id = auth.uid() OR is_bot = true);

ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- ── GAME STATE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_state (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id               UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
  round_number          INT NOT NULL DEFAULT 1,
  phase                 TEXT NOT NULL DEFAULT 'deal'
                          CHECK (phase IN (
                            'deal', 'hand_review', 'blind_action',
                            'reveal', 'elimination_check', 'finished'
                          )),
  pairs                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  bye_player_id         UUID,
  committed_cards       JSONB NOT NULL DEFAULT '{}'::jsonb,
  negotiation_deadline  TIMESTAMPTZ,
  phase_deadline        TIMESTAMPTZ,
  winner_faction        TEXT CHECK (winner_faction IN ('humans', 'zombies')),
  winner_player_id      UUID,
  reveal_sequence       JSONB DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_state_select" ON game_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.room_id = game_state.room_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "game_state_insert" ON game_state
  FOR INSERT WITH CHECK (true);

CREATE POLICY "game_state_update" ON game_state
  FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE game_state;

-- ── ROUND LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number  INT NOT NULL,
  player_a_id   UUID NOT NULL,
  player_b_id   UUID NOT NULL,
  card_a        JSONB,
  card_b        JSONB,
  winner_id     UUID,
  outcome       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE round_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_log_select" ON round_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.room_id = round_log.room_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "round_log_insert" ON round_log
  FOR INSERT WITH CHECK (true);

-- ── MATCHMAKING QUEUE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE,
  username    TEXT NOT NULL,
  avatar_url  TEXT NOT NULL DEFAULT '',
  joined_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matchmaking_select" ON matchmaking_queue
  FOR SELECT USING (true);

CREATE POLICY "matchmaking_insert" ON matchmaking_queue
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "matchmaking_delete" ON matchmaking_queue
  FOR DELETE USING (user_id = auth.uid());

-- ── COMMIT CARDS RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION commit_cards(
  p_room_id   UUID,
  p_player_id UUID,
  p_cards     JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_state
  SET committed_cards = committed_cards || jsonb_build_object(p_player_id::text, p_cards),
      updated_at = now()
  WHERE room_id = p_room_id;
END;
$$;
