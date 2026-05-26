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
  event: 'numeric' | 'infection' | 'elimination' | 'draw' | 'vaccine_cure'
  totalA: number
  totalB: number
  stolenCard?: Card
  eliminatedId?: string
  infectedId?: string
  infectorId?: string
  curedId?: string
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

// DEV bot auto-commit: deterministic card selection by username convention.
// DEV_BOT_1 → shotgun (falls back to number), DEV_BOT_2 → vaccine (falls back to number),
// all others (DEV_BOT_3, Subject Zero fallback, generic) → first unused number.
function selectBotCard(player: Player): Card[] {
  const hand: Card[] = Array.isArray(player.hand) ? player.hand : JSON.parse(player.hand as unknown as string)
  const unused = (type: string) => hand.find((c: Card) => c.type === type && !c.used)
  const unusedNumbers = () => hand.filter((c: Card) => c.type === 'number' && !c.used)
  if (player.username === 'DEV_BOT_1') {
    const card = unused('shotgun') ?? unusedNumbers()[0]
    return card ? [card] : hand.slice(0, 1)
  }
  if (player.username === 'DEV_BOT_2') {
    const card = unused('vaccine') ?? unusedNumbers()[0]
    return card ? [card] : hand.slice(0, 1)
  }
  // DEV_BOT_3 and all other bots: always commit first number card
  const nums = unusedNumbers()
  return nums.length ? [nums[0]] : hand.slice(0, 1)
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

  // Both commit zombie cards — zombie duel, numeric tiebreak
  if (sA?.type === 'zombie' && sB?.type === 'zombie') return resolveNumeric(cardsA, cardsB, pA, pB)

  // Priority 1 — Shotgun: eliminates infected opponent; useless against alive players
  if (sA?.type === 'shotgun' && pB.status === 'infected') {
    return { winner_id: pA.id, loser_id: pB.id, event: 'elimination', eliminatedId: pB.id, totalA: 0, totalB: 0 }
  }
  if (sB?.type === 'shotgun' && pA.status === 'infected') {
    return { winner_id: pB.id, loser_id: pA.id, event: 'elimination', eliminatedId: pA.id, totalA: 0, totalB: 0 }
  }

  // Priority 2 — Vaccine: a NORMAL (alive) player's vaccine cures their infected opponent.
  // An infected player's vaccine has no curing power.
  // Shotgun already handled above, so if we reach here the shooter fired at an alive target.
  if (sA?.type === 'vaccine' && pA.status === 'alive' && pB.status === 'infected') {
    return { winner_id: pA.id, loser_id: pB.id, event: 'vaccine_cure', curedId: pB.id, totalA: 0, totalB: 0 }
  }
  if (sB?.type === 'vaccine' && pB.status === 'alive' && pA.status === 'infected') {
    return { winner_id: pB.id, loser_id: pA.id, event: 'vaccine_cure', curedId: pA.id, totalA: 0, totalB: 0 }
  }

  // Priority 3 — Zombie: infects a normal (alive) opponent; cannot re-infect already-infected
  if (sA?.type === 'zombie' && pB.status === 'alive') {
    return { winner_id: pA.id, loser_id: pB.id, event: 'infection', infectedId: pB.id, infectorId: pA.id, totalA: 0, totalB: 0 }
  }
  if (sB?.type === 'zombie' && pA.status === 'alive') {
    return { winner_id: pB.id, loser_id: pA.id, event: 'infection', infectedId: pA.id, infectorId: pB.id, totalA: 0, totalB: 0 }
  }

  // All other cases (shotgun vs alive, vaccine vs alive, lone vaccine, etc.) — numeric
  return resolveNumeric(cardsA, cardsB, pA, pB)
}

/**
 * Give the newly infected player a zombie card.
 * If their current hand already has 7+ cards, a random number card is replaced.
 * Otherwise the zombie card is simply appended.
 */
function buildInfectedHand(hand: Card[]): Card[] {
  const zombieCard: Card = { id: `zombie-${crypto.randomUUID()}`, type: 'zombie', value: 0, used: false }
  if (hand.length >= 7) {
    const numericIndices: number[] = []
    hand.forEach((c, i) => { if (c.type === 'number') numericIndices.push(i) })
    if (numericIndices.length > 0) {
      const removeIdx = numericIndices[Math.floor(Math.random() * numericIndices.length)]
      return [...hand.slice(0, removeIdx), zombieCard, ...hand.slice(removeIdx + 1)]
    }
  }
  return [...hand, zombieCard]
}

/**
 * Pair up players for the next round.
 * If the count is odd one player sits out (bye). The bye rotates sequentially
 * through a stable ordering so no player waits two rounds in a row.
 */
function generatePairs(players: Player[], prevByeId: string | null = null): { pairs: string[][], bye: string | null } {
  if (players.length % 2 === 0) {
    // Even — everyone plays
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const pairs: string[][] = []
    for (let i = 0; i < shuffled.length - 1; i += 2) pairs.push([shuffled[i].id, shuffled[i + 1].id])
    return { pairs, bye: null }
  }
  // Odd — choose next bye player in stable (alphabetical ID) rotation
  const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id))
  let byeIdx = 0
  if (prevByeId) {
    const prevIdx = sorted.findIndex(p => p.id === prevByeId)
    if (prevIdx >= 0) byeIdx = (prevIdx + 1) % sorted.length
  }
  const byePlayer = sorted[byeIdx]
  const remaining = players.filter(p => p.id !== byePlayer.id)
  const shuffled = [...remaining].sort(() => Math.random() - 0.5)
  const pairs: string[][] = []
  for (let i = 0; i < shuffled.length - 1; i += 2) pairs.push([shuffled[i].id, shuffled[i + 1].id])
  return { pairs, bye: byePlayer.id }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {

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
  const rawCommitted: Record<string, unknown> = gs.committed_cards ?? {}
  // commit_cards RPC stores p_cards as a JSON string inside the JSONB column — parse if needed
  const committedCards: Record<string, Card[]> = {}
  for (const [uid, val] of Object.entries(rawCommitted)) {
    committedCards[uid] = typeof val === 'string' ? JSON.parse(val) : (val as Card[])
  }
  const outcomes: PairOutcome[] = []
  const eliminations: string[] = []
  const infections: string[] = []

  for (const [aId, bId] of pairs) {
    const pA = players.find(p => p.id === aId)
    const pB = players.find(p => p.id === bId)
    if (!pA || !pB) continue

    let cardsA = committedCards[pA.user_id] ?? []
    let cardsB = committedCards[pB.user_id] ?? []

    // Only use random Subject Zero logic for the Subject Zero bot; lobby bots use their committed cards
    if (pA.user_id === SUBJECT_ZERO_USER_ID) cardsA = generateSubjectZeroCommit(generateSubjectZeroHand())
    if (pB.user_id === SUBJECT_ZERO_USER_ID) cardsB = generateSubjectZeroCommit(generateSubjectZeroHand())

    if (cardsA.length === 0) cardsA = selectBotCard(pA)
    if (cardsB.length === 0) cardsB = selectBotCard(pB)

    const result = resolveSpecialCards(cardsA, cardsB, pA, pB)
    const outcome: PairOutcome = { playerA_id: aId, playerB_id: bId, ...result }

    if ((result.event === 'numeric' || result.event === 'infection') && result.winner_id && result.loser_id) {
      const loser = players.find(p => p.id === result.loser_id)
      if (loser) {
        // Only exclude shotgun/vaccine from stealable pool (zombie stays in hand)
        const loserCommittedIds = new Set((committedCards[loser.user_id] ?? [])
          .filter((c: Card) => c.type === 'shotgun' || c.type === 'vaccine')
          .map((c: Card) => c.id))
        const available = loser.hand.filter((c: Card) => !c.used && !loserCommittedIds.has(c.id))
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

    const committedA = committedCards[pA.user_id] ?? []
    const committedB = committedCards[pB.user_id] ?? []

    // Only shotgun and vaccine are consumed when played; zombie card stays in hand permanently
    const specialIdsA = new Set(committedA
      .filter((c: Card) => c.type === 'shotgun' || c.type === 'vaccine')
      .map((c: Card) => c.id))
    const specialIdsB = new Set(committedB
      .filter((c: Card) => c.type === 'shotgun' || c.type === 'vaccine')
      .map((c: Card) => c.id))
    let newHandA: Card[] = pA.hand.filter((c: Card) => !specialIdsA.has(c.id))
    let newHandB: Card[] = pB.hand.filter((c: Card) => !specialIdsB.has(c.id))

    const updateA: Record<string, unknown> = {}
    const updateB: Record<string, unknown> = {}

    // --- INFECTION ---
    if (outcome.event === 'infection' && outcome.infectedId && outcome.infectorId) {
      if (outcome.infectedId === pA.id) {
        // Replace a number card if already at 7+ cards, otherwise just append
        newHandA = buildInfectedHand(newHandA)
        updateA.status = 'infected'
        updateA.infection_rounds = 1
        updateA.infector_id = outcome.infectorId
      } else {
        newHandB = buildInfectedHand(newHandB)
        updateB.status = 'infected'
        updateB.infection_rounds = 1
        updateB.infector_id = outcome.infectorId
      }
      const infectedPlayer = outcome.infectedId === pA.id ? pA : pB
      const infectorPlayer = outcome.infectorId === pA.id ? pA : pB
      try {
        await supabase.channel(`private:${infectedPlayer.user_id}`).send({
          type: 'broadcast', event: 'infected',
          payload: { infector_username: infectorPlayer.username, round: round_number }
        })
      } catch (_e) { console.warn('Broadcast failed:', _e) }
    }

    // --- ELIMINATION (shotgun on infected player) ---
    if (outcome.event === 'elimination' && outcome.eliminatedId) {
      if (outcome.eliminatedId === pA.id) {
        updateA.status = 'eliminated'
        updateA.elimination_round = round_number
        updateA.elimination_cause = 'shotgun'
      } else {
        updateB.status = 'eliminated'
        updateB.elimination_round = round_number
        updateB.elimination_cause = 'shotgun'
      }
    }

    // --- VACCINE CURE (normal player's vaccine cures infected opponent) ---
    // Shotgun takes precedence: skip if player was just eliminated this outcome
    if (outcome.event === 'vaccine_cure' && outcome.curedId) {
      if (outcome.curedId === pA.id && updateA.status !== 'eliminated') {
        newHandA = newHandA.filter((c: Card) => c.type !== 'zombie')  // zombie card removed on cure
        updateA.status = 'alive'
        updateA.infection_rounds = 0
        updateA.infector_id = null
      } else if (outcome.curedId === pB.id && updateB.status !== 'eliminated') {
        newHandB = newHandB.filter((c: Card) => c.type !== 'zombie')  // zombie card removed on cure
        updateB.status = 'alive'
        updateB.infection_rounds = 0
        updateB.infector_id = null
      }
    }

    // --- CARD STEALING (from non-committed cards in updated hand) ---
    if (outcome.stolenCard && outcome.winner_id && outcome.loser_id) {
      const stolenCard = outcome.stolenCard as Card
      if (outcome.winner_id === pA.id) {
        newHandB = newHandB.filter((c: Card) => c.id !== stolenCard.id)
        newHandA = [...newHandA, stolenCard]
      } else {
        newHandA = newHandA.filter((c: Card) => c.id !== stolenCard.id)
        newHandB = [...newHandB, stolenCard]
      }
    }

    // --- SAVE: single atomic update per player ---
    await supabase.from('players').update({ hand: newHandA, ...updateA }).eq('id', pA.id)
    await supabase.from('players').update({ hand: newHandB, ...updateB }).eq('id', pB.id)
  }

  const { data: infectedPlayers } = await supabase.from('players').select('*').eq('room_id', room_id).eq('status', 'infected')
  for (const ip of infectedPlayers ?? []) {
    // Skip players infected THIS round — they survive their first infected round
    // (infection_rounds was just set to 1 by the outcome loop above)
    if (infections.includes(ip.id)) continue
    const newRounds = (ip.infection_rounds ?? 0) + 1
    if (newRounds >= 2) {
      await supabase.from('players').update({ status: 'eliminated', elimination_round: round_number, elimination_cause: 'infection' }).eq('id', ip.id)
    } else {
      await supabase.from('players').update({ infection_rounds: newRounds }).eq('id', ip.id)
    }
  }

  await supabase.from('round_log').insert({ room_id, round_number, outcomes: JSON.stringify(outcomes) })

  // Eliminate players whose hand has no number cards left (only specials = cannot duel)
  const { data: marginalPlayers } = await supabase.from('players').select('id, hand')
    .eq('room_id', room_id)
    .in('status', ['alive', 'infected'])
    .neq('user_id', SUBJECT_ZERO_USER_ID)
  for (const mp of marginalPlayers ?? []) {
    const hand: Card[] = Array.isArray(mp.hand) ? mp.hand
      : (typeof mp.hand === 'string' ? JSON.parse(mp.hand) : [])
    const hasNumbers = hand.some((c: Card) => c.type === 'number')
    if (!hasNumbers) {
      await supabase.from('players').update({
        status: 'eliminated',
        elimination_round: round_number,
        elimination_cause: 'no_cards',
      }).eq('id', mp.id)
    }
  }

  // Fetch all alive players EXCEPT Subject Zero — lobby bots are included as normal players
  const { data: aliveData } = await supabase.from('players').select('*').eq('room_id', room_id).in('status', ['alive', 'infected']).neq('user_id', SUBJECT_ZERO_USER_ID)
  const realAlive: Player[] = aliveData ?? []
  const humansNow = realAlive.filter((p: Player) => p.status === 'alive')
  const zombiesNow = realAlive.filter((p: Player) => p.status === 'infected')

  // Determine total rounds from room settings
  const roomSettings = (room.settings ?? {}) as { total_rounds?: number; max_players?: number }
  const totalRounds = roomSettings.total_rounds ?? ((roomSettings.max_players ?? 8) - 1)
  const roundsExhausted = round_number >= totalRounds

  // Check if zombie threat ever manifested — prevents premature game-over when no one
  // has ever been infected (e.g. test games where all players start alive).
  // Round_log already has current round inserted, so infection/vaccine_cure/elimination
  // events from this round are included in the scan.
  const { data: logData } = await supabase.from('round_log').select('outcomes').eq('room_id', room_id)
  const zombieEverExisted = zombiesNow.length > 0 || (logData ?? []).some(log => {
    const outs: Array<{ event: string }> = typeof log.outcomes === 'string'
      ? JSON.parse(log.outcomes) : (log.outcomes ?? [])
    return outs.some((o) => o.event === 'infection' || o.event === 'vaccine_cure' || o.event === 'elimination')
  })

  // Check win conditions
  const gameOver =
    realAlive.length < 2 ||
    humansNow.length === 0 ||
    (zombieEverExisted && zombiesNow.length === 0) ||
    roundsExhausted

  if (gameOver) {
    let winnerFaction: 'humans' | 'zombies' | null = null
    let winnerPlayerId: string | null = null

    if (humansNow.length === 0) {
      // All humans infected/eliminated — zombies win (check FIRST to avoid false human victory)
      winnerFaction = 'zombies'
    } else if (zombieEverExisted && zombiesNow.length === 0) {
      // All zombies eliminated or cured, humans remain — humans win
      winnerFaction = 'humans'
      winnerPlayerId = humansNow.length === 1 ? humansNow[0].id : null
    } else if (roundsExhausted) {
      // Time limit reached — faction with more survivors wins; humans win ties
      winnerFaction = zombiesNow.length > humansNow.length ? 'zombies' : 'humans'
      if (winnerFaction === 'humans' && humansNow.length === 1) winnerPlayerId = humansNow[0].id
    } else {
      // Only 1 player alive
      const last = realAlive[0]
      winnerFaction = last.status === 'infected' ? 'zombies' : 'humans'
      winnerPlayerId = last.id
    }

    const { error: gsErr } = await supabase.from('game_state').update({
      phase: 'finished',
      winner_faction: winnerFaction,
      winner_player_id: winnerPlayerId,
      committed_cards: {},
      updated_at: new Date().toISOString(),
    }).eq('room_id', room_id)
    if (gsErr) throw new Error(`game_state finish update failed: ${gsErr.message}`)

    await supabase.from('rooms').update({ status: 'finished' }).eq('id', room_id)

    return new Response(JSON.stringify({ success: true, outcomes, gameOver: true, winnerFaction, nextRound: round_number + 1, eliminatedPlayers: eliminations, infectedPlayers: infections }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  // Game continues — generate new pairs and transition to discussion
  // Pass previous bye_player_id so the bye rotates sequentially
  const { pairs: newPairs, bye } = generatePairs(realAlive, gs.bye_player_id ?? null)
  const finalPairs = [...newPairs]
  // If there's a bye player (odd count), pair them with Subject Zero if it exists
  if (bye) {
    const { data: sz } = await supabase.from('players').select('*').eq('room_id', room_id).eq('user_id', SUBJECT_ZERO_USER_ID).maybeSingle()
    if (sz) finalPairs.push([bye, sz.id])
  }

  // Transition to discussion phase so players can review outcomes before the next duel.
  const { error: gsErr } = await supabase.from('game_state').update({
    round_number: round_number + 1,
    phase: 'discussion',
    pairs: finalPairs,
    bye_player_id: bye,
    committed_cards: {},
    negotiation_deadline: null,
    phase_deadline: null,
    discussion_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('room_id', room_id)
  if (gsErr) throw new Error(`game_state update to discussion failed: ${gsErr.message}`)

  return new Response(JSON.stringify({ success: true, outcomes, nextRound: round_number + 1, eliminatedPlayers: eliminations, infectedPlayers: infections }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
  } catch (err) {
    console.error('resolve-round uncaught error:', err)
    return new Response(JSON.stringify({ error: String(err), detail: err instanceof Error ? err.stack : undefined }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
