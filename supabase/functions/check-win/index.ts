// check-win — pure function, called inline from resolve-round
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Card {
  id: string
  type: 'number' | 'zombie' | 'shotgun' | 'vaccine'
  value: number
  used: boolean
}

interface Player {
  id: string
  user_id: string
  username: string
  avatar_url: string
  status: 'alive' | 'infected' | 'eliminated'
  hand: Card[]
  is_bot: boolean
  elimination_round?: number
}

interface PlayerReveal {
  playerId: string
  username: string
  avatarUrl: string
  finalStatus: 'alive' | 'infected' | 'eliminated'
  isZombie: boolean
  eliminationRound: number | null
  revealOrder: number
}

interface WinResult {
  gameOver: boolean
  winnerFaction: 'humans' | 'zombies' | null
  winnerPlayerId: string | null
  revealSequence: PlayerReveal[]
  survivors: Player[]
}

function isZombiePlayer(p: Player): boolean {
  return p.status === 'infected' || p.hand.some(c => c.type === 'zombie' && !c.used)
}

function buildRevealSequence(allPlayers: Player[], winnerPlayerId: string | null): PlayerReveal[] {
  const eliminated = allPlayers.filter(p => p.status === 'eliminated').sort((a, b) => (a.elimination_round ?? 0) - (b.elimination_round ?? 0))
  const infectedSurvivors = allPlayers.filter(p => p.status === 'infected')
  const cleanSurvivors = allPlayers.filter(p => p.status === 'alive' && p.id !== winnerPlayerId)
  const winner = allPlayers.find(p => p.id === winnerPlayerId)

  const sequence = [...eliminated, ...infectedSurvivors, ...cleanSurvivors, winner].filter(Boolean) as Player[]

  return sequence.map((p, i) => ({
    playerId: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
    finalStatus: p.status,
    isZombie: isZombiePlayer(p),
    eliminationRound: p.elimination_round ?? null,
    revealOrder: i
  }))
}

export async function checkWin(supabase: ReturnType<typeof createClient>, room_id: string, round_number: number): Promise<WinResult> {
  const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id).eq('is_bot', false)
  const players: Player[] = allPlayers ?? []

  const alivePlayers = players.filter(p => p.status === 'alive' || p.status === 'infected')
  const zombiesAlive = alivePlayers.filter(p => isZombiePlayer(p))
  const humansAlive = alivePlayers.filter(p => !isZombiePlayer(p))

  const noWin: WinResult = { gameOver: false, winnerFaction: null, winnerPlayerId: null, revealSequence: [], survivors: alivePlayers }

  if (alivePlayers.length === 0) {
    const seq = buildRevealSequence(players, null)
    const result: WinResult = { gameOver: true, winnerFaction: null, winnerPlayerId: null, revealSequence: seq, survivors: [] }
    await persistWin(supabase, room_id, round_number, result, players)
    return result
  }

  if (zombiesAlive.length === 0) {
    const lastHuman = humansAlive.length === 1 ? humansAlive[0].id : null
    const seq = buildRevealSequence(players, lastHuman)
    const result: WinResult = { gameOver: true, winnerFaction: 'humans', winnerPlayerId: lastHuman, revealSequence: seq, survivors: humansAlive }
    await persistWin(supabase, room_id, round_number, result, players)
    return result
  }

  if (humansAlive.length === 0) {
    const seq = buildRevealSequence(players, null)
    const result: WinResult = { gameOver: true, winnerFaction: 'zombies', winnerPlayerId: null, revealSequence: seq, survivors: zombiesAlive }
    await persistWin(supabase, room_id, round_number, result, players)
    return result
  }

  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0]
    const faction = isZombiePlayer(winner) ? 'zombies' : 'humans'
    const seq = buildRevealSequence(players, winner.id)
    const result: WinResult = { gameOver: true, winnerFaction: faction, winnerPlayerId: winner.id, revealSequence: seq, survivors: [winner] }
    await persistWin(supabase, room_id, round_number, result, players)
    return result
  }

  return noWin
}

async function persistWin(supabase: ReturnType<typeof createClient>, room_id: string, round_number: number, result: WinResult, players: Player[]) {
  await supabase.from('game_state').update({
    phase: 'finished',
    winner_faction: result.winnerFaction,
    winner_player_id: result.winnerPlayerId,
    reveal_sequence: result.revealSequence
  }).eq('room_id', room_id)

  await supabase.from('rooms').update({ status: 'finished' }).eq('id', room_id)

  await supabase.from('game_events').insert({
    room_id,
    round_number,
    event_type: 'game_end',
    metadata: {
      winner_faction: result.winnerFaction,
      winner_player_id: result.winnerPlayerId,
      total_players: players.length,
      survivors: result.survivors.length
    }
  })
}

// HTTP handler for standalone calls
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { room_id, round_number } = await req.json()
  const result = await checkWin(supabase, room_id, round_number ?? 0)
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
})
