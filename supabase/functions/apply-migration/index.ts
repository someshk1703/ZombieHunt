import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'

Deno.serve(async (req: Request) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!dbUrl) return new Response(JSON.stringify({ error: 'No DB URL' }), { status: 500, headers: corsHeaders })

  const sql = postgres(dbUrl, { ssl: 'require' })
  const results: string[] = []

  try {
    // Find and drop ALL existing phase check constraints
    const constraints = await sql`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'game_state'::regclass AND contype = 'c' AND conname ILIKE '%phase%'
    `
    for (const row of constraints) {
      await sql`ALTER TABLE game_state DROP CONSTRAINT IF EXISTS ${sql(row.conname)}`
      results.push(`dropped: ${row.conname}`)
    }

    // Add the new constraint including 'discussion'
    await sql`
      ALTER TABLE game_state ADD CONSTRAINT game_state_phase_check
      CHECK (phase IN ('deal','hand_review','blind_action','reveal','elimination_check','discussion','finished'))
    `
    results.push('added new phase constraint with discussion')

    // Add discussion_started_at column if missing
    await sql`ALTER TABLE game_state ADD COLUMN IF NOT EXISTS discussion_started_at TIMESTAMPTZ`
    results.push('discussion_started_at column ensured')

    // Add negotiation_deadline column if missing (safety check)
    await sql`ALTER TABLE game_state ADD COLUMN IF NOT EXISTS negotiation_deadline TIMESTAMPTZ`
    results.push('negotiation_deadline column ensured')

    // Add outcomes JSONB column to round_log for multi-pair-per-round storage
    await sql`ALTER TABLE round_log ADD COLUMN IF NOT EXISTS outcomes JSONB`
    results.push('round_log.outcomes column ensured')

    // Ensure elimination cause supports all runtime values
    await sql`ALTER TABLE players DROP CONSTRAINT IF EXISTS players_elimination_cause_check`
    await sql`
      ALTER TABLE players
      ADD CONSTRAINT players_elimination_cause_check
      CHECK (
        elimination_cause IS NULL
        OR elimination_cause IN ('shotgun', 'infection', 'no_cards')
      )
    `
    results.push('players.elimination_cause constraint ensured (shotgun/infection/no_cards)')

  } catch (err) {
    results.push(`error: ${String(err)}`)
  } finally {
    await sql.end()
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
