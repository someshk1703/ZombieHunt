import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dealCards } from '../_shared/dealCards.ts'

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
      .from('players').select('id, user_id').eq('room_id', room_id).eq('is_bot', false)
    if (playersErr || !players || players.length < 3) {
      return new Response(JSON.stringify({ error: 'Need at least 3 players' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3.5 Create Subject Zero bot if odd player count
    const SUBJECT_ZERO_UUID = '00000000-0000-0000-0000-000000000000'
    if (players.length % 2 !== 0) {
      const { data: existing } = await supabase
        .from('players').select('id').eq('room_id', room_id).eq('user_id', SUBJECT_ZERO_UUID).maybeSingle()
      if (!existing) {
        await supabase.from('players').insert({
          room_id,
          user_id: SUBJECT_ZERO_UUID,
          username: 'SUBJECT ZERO',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=subjectzero&backgroundColor=0a1f0a',
          status: 'alive',
          lives: 999,
          is_bot: true,
          is_host: false,
          is_ready: true,
          hand: [],
          score: 0,
        })
      }
    }

    // Re-fetch all players including bot
    const { data: allPlayersData } = await supabase
      .from('players').select('id, user_id').eq('room_id', room_id)
    const allPlayers = allPlayersData ?? players

    // 4. Set room status to playing
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', room_id)
    roomUpdated = true

    // 5. Deal cards inline
    const dealSummary = await dealCards(supabase, allPlayers)
    console.log('[start-game] deal summary:', JSON.stringify({ ...dealSummary, zombiePlayers: '[REDACTED]', totalPlayers: allPlayers.length }))

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
