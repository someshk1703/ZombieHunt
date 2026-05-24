import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dealCards } from '../deal-cards/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let roomUpdated = false

  try {
    const { room_id, host_id } = await req.json()

    // 1. Validate room exists and is in lobby
    const { data: room, error: roomErr } = await supabase
      .from('rooms').select('*').eq('id', room_id).single()
    if (roomErr || !room) {
      return new Response(JSON.stringify({ error: 'Room not available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (room.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Room not available' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validate host
    if (room.host_id !== host_id) {
      return new Response(JSON.stringify({ error: 'Only host can start game' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Validate player count >= 3
    const { data: players, error: playersErr } = await supabase
      .from('players').select('id, user_id').eq('room_id', room_id)
    if (playersErr || !players || players.length < 3) {
      return new Response(JSON.stringify({ error: 'Need at least 3 players' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Set room status to playing
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', room_id)
    roomUpdated = true

    // 5. Deal cards inline
    const dealSummary = await dealCards(supabase, players)
    console.log('[start-game] deal summary:', JSON.stringify({ ...dealSummary, zombiePlayers: '[REDACTED]' }))

    // 6. Create game_state with phase='deal' (15s for dealing animation + hand review)
    const phaseDeadline = new Date(Date.now() + 15000).toISOString()
    const { data: gameState, error: gsErr } = await supabase
      .from('game_state').insert({
        room_id,
        round_number: 1,
        phase: 'deal',
        pairs: [],
        bye_player_id: null,
        committed_cards: {},
        phase_deadline: phaseDeadline,
      }).select().single()

    if (gsErr) throw gsErr

    return new Response(JSON.stringify({ success: true, game_state_id: gameState.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[start-game] error:', err)
    if (roomUpdated) {
      await supabase.from('rooms').update({ status: 'lobby' }).eq('id', (await req.json().catch(() => ({}))).room_id).catch(() => {})
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
