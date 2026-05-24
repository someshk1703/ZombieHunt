// resolve-round Edge Function — full implementation
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUBJECT_ZERO_USER_ID = '00000000-0000-0000-0000-000000000000'

interface Card {
  id: string
  type: 'number' | 'zombie' | 'shotgun' | 'vaccine'
  value: number
  suit?: string
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
  infection_rounds?: number
  infector_id?: string
}

interface PairOutcome {
  playerA_id: string
  playerB_id: string
  winner_id: string | null
  loser_id: string | null
  event: 'numeric' | 'infection' | 'elimination' | 'draw'
  totalA: number
  totalB: number
  stolenCard?: Card
  eliminatedId?: string
  infectedId?: string
  infectorId?: string
}

function generateSubjectZeroHand(): Card[] {
  const suits = ['spades', 'clubs', 'hearts', 'diamonds']
  const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  const hand: Card[] = []
  if (Math.random() < 0.15) hand.push({ id: `sz-zombie-${Date.now()}`, type: 'zombie', value: 0, used: false })
  if (Math.random() < 0.40) hand.push({ id: `sz-shotgun-${Date.now()}`, type: 'shotgun', value: 0, used: false })
  if (Math.random() < 0.20) hand.push({ id: `sz-vaccine-${Date.now()}`, type: 'vaccine', value: 0, used: false })
  while (hand.length < 7) {
    const suit = suits[Math.floor(Math.random() * suits.length)]
    const value = values[Math.floor(Math.random() * values.length)]
    hand.push({ id: `sz-num-${Date.now()}-${hand.length}`, type: 'number', value, suit, used: false })
  }
  return hand
}

function generateSubjectZeroCommit(hand: Card[]): Card[] {
  const commitCount = Math.floor(Math.random() * 3) + 1
  const specials = hand.filter(c => c.type !== 'number')
  const numbers = hand.filter(c => c.type === 'number')
  const committed: Card[] = []
  if (specials.length > 0 && Math.random() < 0.30) {
    committed.push(specials[Math.floor(Math.random() * specials.length)])
  }
  while (committed.length < commitCount && numbers.length > 0) {
    const idx = Math.floor(Math.random() * numbers.length)
    committed.push(numbers.splice(idx, 1)[0])
  }
  return committed
}

function resolveNumeric(cardsA: Card[], cardsB: Card[], pA: Player, pB: Player): Omit<PairOutcome, 'playerA_id' | 'playerB_id'> {
  const totalA = cardsA.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
  const totalB = cardsB.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
  if (totalA > totalB) return { winner_id: pA.id, loser_id: pB.id, event: 'numeric', totalA, totalB }
  if (totalB > totalA) return { winner_id: pB.id, loser_id: pA.id, event: 'numeric', totalA, totalB }
  return { winner_id: null, loser_id: null, event: 'draw', totalA, totalB }
}

function resolveSpecialCards(cardsA: Card[], cardsB: Card[], pA: Player, pB: Player): Omit<PairOutcome, 'playerA_id' | 'playerB_id'> {
  const sA = cardsA.find(c => c.type !== 'number')
  const sB = cardsB.find(c => c.type !== 'number')
  if (sA?.type === 'zombie' && sB?.type === 'zombie') return resolveNumeric(cardsA, cardsB, pA, pB)
  if (sA?.type === 'shotgun') {
    if (pB.status === 'infected') return { winner_id: pA.id, loser_id: pB.id, event: 'elimination', eliminatedId: pB.id, totalA: 0, totalB: 0 }
    return resolveNumeric(cardsA, cardsB, pA, pB)
  }
  if (sB?.type === 'shotgun') {
    if (pA.status === 'infected') return { winner_id: pB.id, loser_id: pA.id, event: 'elimination', eliminatedId: pA.id, totalA: 0, totalB: 0 }
    return resolveNumeric(cardsA, cardsB, pA, pB)
  }
  if ((sA?.type === 'zombie' && sB?.type === 'vaccine') || (sB?.type === 'zombie' && sA?.type === 'vaccine')) {
    return resolveNumeric(cardsA, cardsB, pA, pB)
  }
  if (sA?.type === 'zombie') return { winner_id: pA.id, loser_id: pB.id, event: 'infection', infectedId: pB.id, infectorId: pA.id, totalA: 0, totalB: 0 }
  if (sB?.type === 'zombie') return { winner_id: pB.id, loser_id: pA.id, event: 'infection', infectedId: pA.id, infectorId: pB.id, totalA: 0, totalB: 0 }
  if (sA?.type === 'vaccine' || sB?.type === 'vaccine') return resolveNumeric(cardsA, cardsB, pA, pB)
  return resolveNumeric(cardsA, cardsB, pA, pB)
}

function generatePairs(players: Player[]): { pairs: string[][], bye: string | null } {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const pairs: string[][] = []
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i].id, shuffled[i + 1].id])
  }
  const bye = shuffled.length % 2 !== 0 ? shuffled[shuffled.length - 1].id : null
  return { pairs, bye }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') ?? '')
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { room_id, round_number } = await req.json()

  const { data: room } = await supabase.from('rooms').select('*').eq('id', room_id).single()
  if (!room || room.status !== 'playing') return new Response(JSON.stringify({ error: 'Invalid room' }), { status: 400 })

  const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
  if (!gs) return new Response(JSON.stringify({ error: 'No game state' }), { status: 400 })

  const { data: hostPlayer } = await supabase.from('players').select('*').eq('room_id', room_id).eq('user_id', user.id).single()
  if (!hostPlayer?.is_host) return new Response(JSON.stringify({ error: 'Not host' }), { status: 403 })

  const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id).in('status', ['alive', 'infected'])
  const players: Player[] = allPlayers ?? []

  const pairs: string[][] = gs.pairs ?? []
  const committedCards: Record<string, Card[]> = gs.committed_cards ?? {}
  const outcomes: PairOutcome[] = []
  const eliminations: string[] = []
  const infections: string[] = []

  for (const [aId, bId] of pairs) {
    const pA = players.find(p => p.id === aId)
    const pB = players.find(p => p.id === bId)
    if (!pA || !pB) continue

    let cardsA = committedCards[pA.user_id] ?? []
    let cardsB = committedCards[pB.user_id] ?? []

    if (pA.is_bot) cardsA = generateSubjectZeroCommit(generateSubjectZeroHand())
    if (pB.is_bot) cardsB = generateSubjectZeroCommit(generateSubjectZeroHand())

    if (cardsA.length === 0) {
      const num = pA.hand.filter((c: Card) => c.type === 'number' && !c.used)
      cardsA = num.length ? [num[0]] : pA.hand.slice(0, 1)
    }
    if (cardsB.length === 0) {
      const num = pB.hand.filter((c: Card) => c.type === 'number' && !c.used)
      cardsB = num.length ? [num[0]] : pB.hand.slice(0, 1)
    }

    const result = resolveSpecialCards(cardsA, cardsB, pA, pB)
    const outcome: PairOutcome = { playerA_id: aId, playerB_id: bId, ...result }

    if ((result.event === 'numeric' || result.event === 'infection') && result.winner_id && result.loser_id) {
      const loser = players.find(p => p.id === result.loser_id)
      if (loser) {
        const available = loser.hand.filter((c: Card) => !c.used)
        if (available.length > 0) outcome.stolenCard = available[Math.floor(Math.random() * available.length)]
      }
    }

    outcomes.push(outcome)
    if (result.eliminatedId) eliminations.push(result.eliminatedId)
    if (result.infectedId) infections.push(result.infectedId)
  }

  for (const outcome of outcomes) {
    const pA = players.find(p => p.id === outcome.playerA_id)!
    const pB = players.find(p => p.id === outcome.playerB_id)!
    if (!pA || !pB) continue

    for (const player of [pA, pB]) {
      const committed = committedCards[player.user_id] ?? []
      const ids = new Set(committed.map((c: Card) => c.id))
      const newHand = player.hand.map((c: Card) => ids.has(c.id) ? { ...c, used: true } : c)
      await supabase.from('players').update({ hand: newHand }).eq('id', player.id)
    }

    if (outcome.event === 'infection' && outcome.infectedId && outcome.infectorId) {
      await supabase.from('players').update({ status: 'infected', infection_rounds: 1, infector_id: outcome.infectorId }).eq('id', outcome.infectedId)
      const infected = players.find(p => p.id === outcome.infectedId)
      if (infected) {
        const winner = players.find(p => p.id === outcome.infectorId)
        await supabase.channel(`private:${infected.user_id}`).send({
          type: 'broadcast', event: 'infected',
          payload: { infector_username: winner?.username ?? 'Unknown', round: round_number }
        })
      }
    }

    if (outcome.event === 'elimination' && outcome.eliminatedId) {
      await supabase.from('players').update({ status: 'eliminated', elimination_round: round_number, elimination_cause: 'shotgun' }).eq('id', outcome.eliminatedId)
    }

    if (outcome.stolenCard && outcome.winner_id && outcome.loser_id) {
      const winnerP = players.find(p => p.id === outcome.winner_id)!
      const loserP = players.find(p => p.id === outcome.loser_id)!
      await supabase.from('players').update({ hand: loserP.hand.filter((c: Card) => c.id !== outcome.stolenCard!.id) }).eq('id', loserP.id)
      await supabase.from('players').update({ hand: [...winnerP.hand, outcome.stolenCard] }).eq('id', winnerP.id)
    }

    for (const [player, committed] of [[pA, committedCards[pA.user_id] ?? []], [pB, committedCards[pB.user_id] ?? []]] as [Player, Card[]][]) {
      if (committed.some((c: Card) => c.type === 'vaccine') && player.status === 'infected') {
        await supabase.from('players').update({ status: 'alive', infection_rounds: 0, infector_id: null }).eq('id', player.id)
      }
    }
  }

  const { data: infectedPlayers } = await supabase.from('players').select('*').eq('room_id', room_id).eq('status', 'infected')
  for (const ip of infectedPlayers ?? []) {
    const newRounds = (ip.infection_rounds ?? 0) + 1
    if (newRounds >= 2) {
      await supabase.from('players').update({ status: 'eliminated', elimination_round: round_number, elimination_cause: 'infection' }).eq('id', ip.id)
    } else {
      await supabase.from('players').update({ infection_rounds: newRounds }).eq('id', ip.id)
    }
  }

  await supabase.from('round_log').insert({ room_id, round_number, outcomes: JSON.stringify(outcomes) })

  const { data: alive } = await supabase.from('players').select('*').eq('room_id', room_id).in('status', ['alive', 'infected']).eq('is_bot', false)

  if ((alive?.length ?? 0) >= 2) {
    const { pairs: newPairs, bye } = generatePairs(alive as Player[])
    const finalPairs = [...newPairs]
    if (bye) {
      const { data: sz } = await supabase.from('players').select('*').eq('room_id', room_id).eq('is_bot', true).single()
      if (sz) finalPairs.push([bye, sz.id])
    }

    const negTimer = room.settings?.negotiation_timer_seconds ?? 60
    const negotiationDeadline = new Date(Date.now() + negTimer * 1000).toISOString()
    const phaseDeadline = new Date(Date.now() + negTimer * 1000 + 25000).toISOString()

    await supabase.from('game_state').update({
      round_number: round_number + 1,
      phase: 'blind_action',
      pairs: finalPairs,
      bye_player_id: null,
      committed_cards: {},
      negotiation_deadline: negotiationDeadline,
      phase_deadline: phaseDeadline,
      updated_at: new Date().toISOString()
    }).eq('room_id', room_id)
  } else {
    // Trigger win check — set elimination_check phase
    await supabase.from('game_state').update({ phase: 'elimination_check' }).eq('room_id', room_id)
  }

  return new Response(JSON.stringify({ success: true, outcomes, nextRound: round_number + 1, eliminatedPlayers: eliminations, infectedPlayers: infections }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
