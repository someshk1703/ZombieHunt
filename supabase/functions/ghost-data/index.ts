// ghost-data Edge Function — full implementation
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') ?? '')
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { room_id } = await req.json()

  // Verify player exists and is eliminated
  const { data: requestingPlayer } = await supabase
    .from('players').select('*').eq('room_id', room_id).eq('user_id', user.id).single()

  if (!requestingPlayer) return new Response(JSON.stringify({ error: 'Player not found' }), { status: 404 })
  if (requestingPlayer.status !== 'eliminated') {
    return new Response(JSON.stringify({ error: 'Ghost data only for eliminated players' }), { status: 403 })
  }

  // Fetch all player hands
  const { data: allPlayers } = await supabase.from('players').select('id, user_id, username, avatar_url, status, hand, infection_rounds, infector_id, is_bot').eq('room_id', room_id)

  const allHands: Record<string, unknown[]> = {}
  const infectionMap: Record<string, { infectorId: string | null; infectorUsername: string | null }> = {}
  const zombieCardHolders: string[] = []

  for (const p of allPlayers ?? []) {
    allHands[p.id] = p.hand ?? []
    if (p.status === 'infected') {
      const infector = (allPlayers ?? []).find(x => x.id === p.infector_id)
      infectionMap[p.id] = { infectorId: p.infector_id, infectorUsername: infector?.username ?? null }
    }
    const hasZombie = (p.hand ?? []).some((c: { type: string; used: boolean }) => c.type === 'zombie' && !c.used)
    if (hasZombie) zombieCardHolders.push(p.id)
  }

  // Committed cards (ghost sees counts only, not actual cards)
  const { data: gs } = await supabase.from('game_state').select('committed_cards').eq('room_id', room_id).single()
  const committedCounts: Record<string, number> = {}
  if (gs?.committed_cards) {
    for (const [uid, cards] of Object.entries(gs.committed_cards as Record<string, unknown[]>)) {
      committedCounts[uid] = Array.isArray(cards) ? cards.length : 0
    }
  }

  return new Response(JSON.stringify({
    allHands,
    infectionMap,
    zombieCardHolders,
    committedCards: committedCounts,
    players: (allPlayers ?? []).map(p => ({ id: p.id, user_id: p.user_id, username: p.username, avatar_url: p.avatar_url, status: p.status, is_bot: p.is_bot }))
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
