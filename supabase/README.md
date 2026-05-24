# ZOMBIE HUNT — Supabase Backend

## Setup

### 1. Environment Variables

Create a `.env.local` file (never commit this):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Run Migrations

Via Supabase CLI:
```bash
supabase db push
# or apply the schema directly in the SQL editor:
# Dashboard → SQL Editor → paste supabase/schema.sql → Run
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy start-game
supabase functions deploy deal-cards
supabase functions deploy resolve-round
supabase functions deploy check-win
supabase functions deploy matchmaking
supabase functions deploy ghost-data
```

Set secrets for each function:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Enable Realtime

In the Supabase dashboard → Database → Replication, enable Realtime for:
- `rooms` — columns: `status`, `settings`
- `players` — columns: `status`, `lives`, `is_ready`, `score`, `username`, `avatar_url`
  (NOT `hand`, `infector_id`, `infection_rounds`)
- `game_state` — columns: `round_number`, `phase`, `pairs`, `bye_player_id`, `phase_deadline`
- `round_log` — all columns
- `room_chat` — all columns

### 5. Realtime Subscription Pattern (Frontend)

```ts
// Subscribe to game phase changes
supabase
  .channel(`game:${roomId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, handler)
  .subscribe()
```

## RLS Security Model

| Table | Rule |
|---|---|
| `rooms` | Any authenticated user can read; only host can update |
| `players.hand` | Owner only (via `user_id = auth.uid()`) |
| `players.infector_id` | Owner only |
| `players.infection_rounds` | Owner only |
| `game_state.committed_cards` | Filtered per user via `get_my_committed_cards()` function |
| `ghost-data` | Served via Edge Function only — validates `status = 'ghost'` |
