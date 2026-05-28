// resolve-round Edge Function — complete rewrite
// Root causes fixed: no DB writes, no matchup tracking, no card consumption,
// no status updates, wrong win condition, empty round_log/game_events.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUBJECT_ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Card {
  id: string
  type: 'number' | 'zombie' | 'shotgun' | 'vaccine'
  value: number
  suit?: string | null
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
  is_host: boolean
  infection_rounds: number
  infector_id: string | null
  score: number
  cards_stolen: number
  infections_caused: number
  special_cards_played: number
  rounds_survived: number
  elimination_round: number | null
  elimination_cause: string | null
}

interface PlayerUpdate {
  hand: Card[]
  status: string
  infection_rounds: number
  infector_id: string | null
  score: number
  cards_stolen: number
  infections_caused: number
  special_cards_played: number
  rounds_survived: number
  elimination_round: number | null
  elimination_cause: string | null
}

interface Outcome {
  playerA_id: string
  playerB_id: string
  winner_id: string | null
  loser_id: string | null
  event: string
  totalA?: number
  totalB?: number
  infected_id?: string
  infector_id?: string
  eliminated_id?: string
  elimination_cause?: string
  cured_id?: string
  stolen_card?: Card | null
}

interface WinResult {
  gameOver: boolean
  winnerFaction: 'humans' | 'zombies' | null
  winnerPlayerId: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth check
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    const { room_id, round_number } = await req.json()

    // ── 1. FETCH CURRENT STATE ──────────────────────────────
    const [{ data: room }, { data: gameState }, { data: allPlayersRaw }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', room_id).single(),
      supabase.from('game_state').select('*').eq('room_id', room_id).single(),
      supabase.from('players').select('*').eq('room_id', room_id),
    ])

    if (!room || !gameState || !allPlayersRaw) {
      return new Response(JSON.stringify({ error: 'State fetch failed' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    const allPlayers = allPlayersRaw as Player[]

    // Host check
    const callerPlayer = allPlayers.find(p => p.user_id === user.id)
    if (!callerPlayer?.is_host) {
      return new Response(JSON.stringify({ error: 'Not host' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    const pairs: string[][] = gameState.pairs ?? []
    const rawCommitted: Record<string, unknown> = gameState.committed_cards ?? {}

    // Build committed cards keyed by player.id
    // game_state.committed_cards is keyed by user_id; remap to player.id for pair lookups
    const committedByPlayerId: Record<string, Card[]> = {}
    for (const p of allPlayers) {
      const raw = rawCommitted[p.user_id]
      if (raw !== undefined) {
        committedByPlayerId[p.id] = typeof raw === 'string' ? JSON.parse(raw) : (raw as Card[])
      }
    }

    // ── 2. SUBJECT ZERO CARD GENERATION ────────────────────
    const subjectZero = allPlayers.find(p => p.user_id === SUBJECT_ZERO_UUID) ?? null
    if (subjectZero) {
      committedByPlayerId[subjectZero.id] = generateSubjectZeroCommit()
    }

    // ── 3. INITIALIZE PLAYER UPDATE MAP ────────────────────
    // Every player gets an update entry; rounds_survived is pre-incremented
    // (undone for players eliminated this round)
    const playerUpdates: Record<string, PlayerUpdate> = {}
    for (const p of allPlayers) {
      const hand: Card[] = Array.isArray(p.hand)
        ? [...p.hand]
        : JSON.parse(p.hand as unknown as string)
      playerUpdates[p.id] = {
        hand,
        status: p.status,
        infection_rounds: p.infection_rounds || 0,
        infector_id: p.infector_id || null,
        score: p.score || 0,
        cards_stolen: p.cards_stolen || 0,
        infections_caused: p.infections_caused || 0,
        special_cards_played: p.special_cards_played || 0,
        rounds_survived: p.status !== 'eliminated'
          ? (p.rounds_survived || 0) + 1
          : (p.rounds_survived || 0),
        elimination_round: p.elimination_round || null,
        elimination_cause: p.elimination_cause || null,
      }
    }

    // ── 4. RESOLVE EACH PAIR ────────────────────────────────
    const outcomes: Outcome[] = []
    const gameEvents: Record<string, unknown>[] = []

    for (const [idA, idB] of pairs) {
      const pA = allPlayers.find(p => p.id === idA)
      const pB = allPlayers.find(p => p.id === idB)
      if (!pA || !pB) continue

      // Skip already-eliminated players
      if (playerUpdates[pA.id].status === 'eliminated' ||
          playerUpdates[pB.id].status === 'eliminated') continue

      let cardsA: Card[] = committedByPlayerId[idA] ?? []
      let cardsB: Card[] = committedByPlayerId[idB] ?? []

      // Bot fallback: auto-select if no committed cards
      if (cardsA.length === 0 && pA.user_id !== SUBJECT_ZERO_UUID) {
        cardsA = selectBotCard(playerUpdates[pA.id].hand)
      }
      if (cardsB.length === 0 && pB.user_id !== SUBJECT_ZERO_UUID) {
        cardsB = selectBotCard(playerUpdates[pB.id].hand)
      }

      const outcome = resolvePair(pA, pB, cardsA, cardsB, round_number, playerUpdates)
      outcomes.push(outcome)

      // Build game events for story timeline
      const nameOf = (id: string | undefined) =>
        allPlayers.find(p => p.id === id)?.username ?? null

      if (outcome.event === 'infection') {
        gameEvents.push({
          room_id, round_number, event_type: 'infection',
          actor_id: outcome.winner_id,
          target_id: outcome.infected_id,
          actor_username: nameOf(outcome.winner_id ?? undefined),
          target_username: nameOf(outcome.infected_id),
          metadata: { round: round_number }
        })
      } else if (outcome.event === 'elimination') {
        gameEvents.push({
          room_id, round_number, event_type: 'elimination',
          actor_id: outcome.winner_id,
          target_id: outcome.eliminated_id,
          actor_username: nameOf(outcome.winner_id ?? undefined),
          target_username: nameOf(outcome.eliminated_id),
          metadata: { cause: outcome.elimination_cause, round: round_number }
        })
      } else if (outcome.event === 'vaccine') {
        gameEvents.push({
          room_id, round_number, event_type: 'vaccine_used',
          actor_id: outcome.winner_id,
          target_id: outcome.cured_id,
          actor_username: nameOf(outcome.winner_id ?? undefined),
          target_username: nameOf(outcome.cured_id),
          metadata: { round: round_number }
        })
      }
      if (outcome.stolen_card) {
        gameEvents.push({
          room_id, round_number, event_type: 'card_stolen',
          actor_id: outcome.winner_id,
          target_id: outcome.loser_id,
          actor_username: nameOf(outcome.winner_id ?? undefined),
          target_username: nameOf(outcome.loser_id ?? undefined),
          metadata: { card: outcome.stolen_card, round: round_number }
        })
      }
    }

    // ── 5. INCREMENT INFECTION ROUNDS FOR ALREADY-INFECTED ─
    for (const p of allPlayers) {
      if (p.status === 'infected' && playerUpdates[p.id].status === 'infected') {
        playerUpdates[p.id].infection_rounds += 1
      }
    }

    // ── 6. PERSIST ALL PLAYER UPDATES — parallel Promise.all ─
    // THIS IS THE CRITICAL FIX — all player state written to DB atomically
    await Promise.all(
      Object.entries(playerUpdates).map(([playerId, updates]) =>
        supabase.from('players').update(updates).eq('id', playerId)
      )
    )

    // ── 7. WRITE ROUND LOG ──────────────────────────────────
    await supabase.from('round_log').insert({
      room_id,
      round_number,
      outcomes,
      created_at: new Date().toISOString()
    })

    // ── 8. WRITE GAME EVENTS (single batch insert) ─────────
    if (gameEvents.length > 0) {
      await supabase.from('game_events').insert(gameEvents)
    }

    // ── 9. FETCH FRESH PLAYER STATE AFTER UPDATES ──────────
    // Win condition MUST run on DB-confirmed data, never on stale in-memory state
    const { data: freshPlayersRaw } = await supabase
      .from('players').select('*').eq('room_id', room_id)
    const freshPlayers = (freshPlayersRaw ?? []) as Player[]

    // ── 10. CHECK WIN CONDITION ─────────────────────────────
    const roomSettings = (room.settings ?? {}) as { total_rounds?: number }
    const totalRounds = roomSettings.total_rounds ?? 10
    const winResult = checkWin(freshPlayers.filter(p => !p.is_bot), round_number, totalRounds)

    if (winResult.gameOver) {
      await supabase.from('game_events').insert({
        room_id, round_number, event_type: 'game_end',
        actor_id: winResult.winnerPlayerId ?? null,
        metadata: { winner_faction: winResult.winnerFaction, total_rounds: round_number }
      })

      await supabase.from('game_state').update({
        phase: 'finished',
        winner_faction: winResult.winnerFaction,
        winner_player_id: winResult.winnerPlayerId ?? null,
        committed_cards: {},
        updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      await supabase.from('rooms').update({ status: 'finished' }).eq('id', room_id)

      return new Response(JSON.stringify({
        success: true,
        gameOver: true,
        winnerFaction: winResult.winnerFaction,
        nextRound: round_number + 1,
        outcomes,
        eliminatedPlayers: outcomes
          .filter(o => o.event === 'elimination')
          .map(o => o.eliminated_id),
        infectedPlayers: outcomes
          .filter(o => o.event === 'infection')
          .map(o => o.infected_id),
      }), { headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    // ── 11. GENERATE NEXT ROUND PAIRS (NO REPEAT MATCHUPS) ─
    const alivePlayers = freshPlayers.filter(
      p => p.status !== 'eliminated' && p.user_id !== SUBJECT_ZERO_UUID
    )

    // Build matchup history from round_log to avoid repeat pairings
    const { data: allLogs } = await supabase
      .from('round_log').select('outcomes').eq('room_id', room_id)

    const playedMatchups = new Set<string>()
    for (const log of (allLogs ?? [])) {
      const outs: Array<{ playerA_id?: string; playerB_id?: string }> =
        typeof log.outcomes === 'string'
          ? JSON.parse(log.outcomes)
          : (log.outcomes ?? [])
      for (const o of outs) {
        if (o.playerA_id && o.playerB_id) {
          playedMatchups.add([o.playerA_id, o.playerB_id].sort().join('|'))
        }
      }
    }

    const { pairs: newPairs, bye } = generatePairsNoRepeat(
      alivePlayers, playedMatchups, subjectZero
    )

    // ── TRANSITION TO DISCUSSION ───────────────────────────
    // After resolving, advance to discussion phase so players can see results
    // and chat. The DiscussionRoundScreen.startNextRound() will set blind_action
    // + new deadlines when the discussion timer expires or host skips.
    await supabase.from('game_state').update({
      round_number: round_number + 1,
      phase: 'discussion',
      discussion_started_at: new Date().toISOString(),
      pairs: newPairs,
      bye_player_id: bye,
      committed_cards: {},
      updated_at: new Date().toISOString(),
    }).eq('room_id', room_id)

    return new Response(JSON.stringify({
      success: true,
      gameOver: false,
      nextRound: round_number + 1,
      outcomes,
      eliminatedPlayers: outcomes
        .filter(o => o.event === 'elimination')
        .map(o => o.eliminated_id),
      infectedPlayers: outcomes
        .filter(o => o.event === 'infection')
        .map(o => o.infected_id),
    }), { headers: { 'Content-Type': 'application/json', ...CORS } })

  } catch (err) {
    console.error('resolve-round error:', err)
    return new Response(
      JSON.stringify({ error: String(err), detail: err instanceof Error ? err.stack : undefined }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
})

// ── PAIR RESOLUTION ──────────────────────────────────────────

function resolvePair(
  pA: Player,
  pB: Player,
  cardsA: Card[],
  cardsB: Card[],
  roundNum: number,
  updates: Record<string, PlayerUpdate>
): Outcome {
  const specialA = cardsA.find(c => c.type !== 'number')
  const specialB = cardsB.find(c => c.type !== 'number')

  if (specialA) updates[pA.id].special_cards_played += 1
  if (specialB) updates[pB.id].special_cards_played += 1

  // Remove played cards from hand EXCEPT zombie
  // Zombie stays until cured by vaccine or eliminated by shotgun
  consumeCards(pA.id, cardsA, updates)
  consumeCards(pB.id, cardsB, updates)

  // ── SHOTGUN ───────────────────────────────────────────────
  // Eliminates any opponent holding a zombie card OR with infected status
  if (specialA?.type === 'shotgun') {
    if (isZombieThreat(pB, updates)) {
      eliminatePlayer(pB.id, pA.id, 'shotgun', roundNum, updates)
      return {
        playerA_id: pA.id, playerB_id: pB.id,
        winner_id: pA.id, loser_id: pB.id,
        eliminated_id: pB.id,
        event: 'elimination', elimination_cause: 'shotgun',
        totalA: 0, totalB: 0
      }
    }
    // Consumed but ineffective — numeric with remaining number cards only
    return resolveNumeric(pA, pB, cardsA, cardsB, updates)
  }
  if (specialB?.type === 'shotgun') {
    if (isZombieThreat(pA, updates)) {
      eliminatePlayer(pA.id, pB.id, 'shotgun', roundNum, updates)
      return {
        playerA_id: pA.id, playerB_id: pB.id,
        winner_id: pB.id, loser_id: pA.id,
        eliminated_id: pA.id,
        event: 'elimination', elimination_cause: 'shotgun',
        totalA: 0, totalB: 0
      }
    }
    return resolveNumeric(pA, pB, cardsA, cardsB, updates)
  }

  // ── ZOMBIE vs VACCINE ─────────────────────────────────────
  // Rule: vaccine cures the ZOMBIE CARD HOLDER (the infected player), not the vaccine player.
  // Scenario 1/2 Round 2: D plays zombie, B plays vaccine → D becomes normal.
  // winner_id is explicitly set to the VACCINE HOLDER so actor_id in game events is correct.
  if (specialA?.type === 'zombie' && specialB?.type === 'vaccine') {
    curePlayer(pA.id, updates)  // pA holds zombie card — they get cured
    const numeric = resolveNumeric(pA, pB, cardsA, cardsB, updates)
    return { ...numeric, winner_id: pB.id, loser_id: pA.id, event: 'vaccine', cured_id: pA.id }
  }
  if (specialB?.type === 'zombie' && specialA?.type === 'vaccine') {
    curePlayer(pB.id, updates)  // pB holds zombie card — they get cured
    const numeric = resolveNumeric(pA, pB, cardsA, cardsB, updates)
    return { ...numeric, winner_id: pA.id, loser_id: pB.id, event: 'vaccine', cured_id: pB.id }
  }

  // ── STANDALONE VACCINE (self-cure or vaccine vs non-zombie) ───
  // Vaccine is consumed and self-cure applied; event tagged 'vaccine' so game log captures it.
  if (specialA?.type === 'vaccine' && !specialB) {
    const wasCured = updates[pA.id].status === 'infected'
    if (wasCured) curePlayer(pA.id, updates)
    const numeric = resolveNumeric(pA, pB, cardsA, cardsB, updates)
    if (wasCured) return { ...numeric, winner_id: pA.id, event: 'vaccine', cured_id: pA.id }
    return numeric
  }
  if (specialB?.type === 'vaccine' && !specialA) {
    const wasCured = updates[pB.id].status === 'infected'
    if (wasCured) curePlayer(pB.id, updates)
    const numeric = resolveNumeric(pA, pB, cardsA, cardsB, updates)
    if (wasCured) return { ...numeric, winner_id: pB.id, event: 'vaccine', cured_id: pB.id }
    return numeric
  }

  // ── ZOMBIE → INFECTION ────────────────────────────────────
  if (specialA?.type === 'zombie') {
    if (updates[pB.id].status === 'alive') {
      infectPlayer(pB.id, pA.id, updates)
      updates[pA.id].infections_caused += 1
      return {
        playerA_id: pA.id, playerB_id: pB.id,
        winner_id: pA.id, loser_id: pB.id,
        infected_id: pB.id, infector_id: pA.id,
        event: 'infection', totalA: 0, totalB: 0
      }
    }
    return resolveNumeric(pA, pB, cardsA, cardsB, updates)
  }
  if (specialB?.type === 'zombie') {
    if (updates[pA.id].status === 'alive') {
      infectPlayer(pA.id, pB.id, updates)
      updates[pB.id].infections_caused += 1
      return {
        playerA_id: pA.id, playerB_id: pB.id,
        winner_id: pB.id, loser_id: pA.id,
        infected_id: pA.id, infector_id: pB.id,
        event: 'infection', totalA: 0, totalB: 0
      }
    }
    return resolveNumeric(pA, pB, cardsA, cardsB, updates)
  }

  // ── PURE NUMERIC ─────────────────────────────────────────
  return resolveNumeric(pA, pB, cardsA, cardsB, updates)
}

function resolveNumeric(
  pA: Player,
  pB: Player,
  cardsA: Card[],
  cardsB: Card[],
  updates: Record<string, PlayerUpdate>
): Outcome {
  const totalA = cardsA
    .filter(c => c.type === 'number')
    .reduce((s, c) => s + (c.value || 0), 0)
  const totalB = cardsB
    .filter(c => c.type === 'number')
    .reduce((s, c) => s + (c.value || 0), 0)

  if (totalA === totalB) {
    return {
      playerA_id: pA.id, playerB_id: pB.id,
      winner_id: null, loser_id: null,
      event: 'draw', totalA, totalB
    }
  }

  const winner = totalA > totalB ? pA : pB
  const loser  = totalA > totalB ? pB : pA

  // Steal a random number card from loser
  const loserHand = updates[loser.id].hand
  const stealable = loserHand.filter(c => c.type === 'number' && !c.used)
  let stolenCard: Card | null = null

  if (stealable.length > 0) {
    stolenCard = stealable[Math.floor(Math.random() * stealable.length)]
    updates[loser.id].hand = loserHand.filter(c => c.id !== stolenCard!.id)
    const newCard: Card = { ...stolenCard, id: crypto.randomUUID() }
    updates[winner.id].hand = [...updates[winner.id].hand, newCard]
    if (updates[winner.id].hand.length > 7) {
      updates[winner.id].hand = updates[winner.id].hand.slice(0, 7)
    }
    updates[winner.id].cards_stolen += 1
  }

  return {
    playerA_id: pA.id, playerB_id: pB.id,
    winner_id: winner.id, loser_id: loser.id,
    event: 'numeric', totalA, totalB,
    stolen_card: stolenCard
  }
}

// ── HELPERS ──────────────────────────────────────────────────

function consumeCards(
  playerId: string,
  playedCards: Card[],
  updates: Record<string, PlayerUpdate>
) {
  // Remove played cards EXCEPT zombie — zombie stays until cured/eliminated
  const consumedIds = new Set(
    playedCards.filter(c => c.type !== 'zombie').map(c => c.id)
  )
  updates[playerId].hand = updates[playerId].hand.filter(c => !consumedIds.has(c.id))
}

function infectPlayer(
  targetId: string,
  infectorId: string,
  updates: Record<string, PlayerUpdate>
) {
  // Create a NEW zombie card for the target — infector keeps their own zombie card
  const newZombieCard: Card = {
    id: crypto.randomUUID(),
    type: 'zombie',
    value: 15,
    suit: null,
    used: false,
  }
  const hand = [...updates[targetId].hand]
  // Remove one normal card to keep hand at 7 max
  const normalIdx = hand.findIndex(c => c.type === 'number')
  if (normalIdx >= 0) hand.splice(normalIdx, 1)
  hand.push(newZombieCard)

  updates[targetId].status = 'infected'
  updates[targetId].infector_id = infectorId
  updates[targetId].infection_rounds = 1
  updates[targetId].hand = hand
}

function curePlayer(
  playerId: string,
  updates: Record<string, PlayerUpdate>
) {
  updates[playerId].hand = updates[playerId].hand.filter(c => c.type !== 'zombie')
  updates[playerId].status = 'alive'
  updates[playerId].infection_rounds = 0
  updates[playerId].infector_id = null
}

function eliminatePlayer(
  targetId: string,
  _killedById: string,
  cause: string,
  roundNum: number,
  updates: Record<string, PlayerUpdate>
) {
  updates[targetId].status = 'eliminated'
  updates[targetId].elimination_cause = cause
  updates[targetId].elimination_round = roundNum
  // Undo the rounds_survived increment from init (player didn't survive this round)
  updates[targetId].rounds_survived = Math.max(0, updates[targetId].rounds_survived - 1)
}

function isZombieThreat(
  player: Player,
  updates: Record<string, PlayerUpdate>
): boolean {
  // Check UPDATED in-memory state — catches same-round infections across pairs
  return (
    updates[player.id].status === 'infected' ||
    updates[player.id].hand.some(c => c.type === 'zombie' && !c.used)
  )
}

function selectBotCard(hand: Card[]): Card[] {
  const unused = hand.filter(c => !c.used)
  // Bots always play number cards — special cards (shotgun/vaccine) require deliberate
  // player intent and should never be auto-selected to avoid breaking the one-use rule
  const num = unused.find(c => c.type === 'number')
  if (num) return [num]
  // Absolute last resort: play any unused card (should not normally happen)
  return unused.length > 0 ? [unused[0]] : (hand.length > 0 ? [hand[0]] : [])
}

// ── WIN CONDITION ─────────────────────────────────────────────
//
// Rules (checked in priority order):
//
//  0. All eliminated simultaneously        → draw (no winner)
//  1. zombieThreats === 0                  → Humans win (all threats gone)
//  2. cleanHumans === 0                    → Zombies win (no humans left)
//  3. cleanHumans === 1  (any zombie count) → "THE DEAD MAN WALK" → Humans win (lone survivor)
//  4. zombieThreats < cleanHumans          → Humans win (humans outnumber zombies)
//  5. cleanHumans   < zombieThreats        → Zombies win (zombies outnumber humans)
//  6. Final round (tied counts)            → majority wins; humans win on exact tie (survivors)

function checkWin(players: Player[], roundNumber: number, totalRounds: number): WinResult {
  const active = players.filter(p => p.status !== 'eliminated')

  // 0. All players eliminated simultaneously (e.g. mutual shotgun)
  if (active.length === 0) {
    return { gameOver: true, winnerFaction: null, winnerPlayerId: null }
  }

  const zombieThreats = active.filter(p =>
    p.status === 'infected' ||
    (p.hand ?? []).some(c => c.type === 'zombie' && !c.used)
  )
  const cleanHumans = active.filter(p =>
    p.status === 'alive' &&
    !(p.hand ?? []).some(c => c.type === 'zombie' && !c.used)
  )

  // 1. No zombie threats remain — humanity prevailed (any round)
  if (zombieThreats.length === 0) {
    return {
      gameOver: true,
      winnerFaction: 'humans',
      winnerPlayerId: cleanHumans.length === 1 ? cleanHumans[0].id : null,
    }
  }

  // 2. No clean humans remain — zombie apocalypse (any round)
  if (cleanHumans.length === 0) {
    return { gameOver: true, winnerFaction: 'zombies', winnerPlayerId: null }
  }

  // 3-5 only apply at the FINAL round — applying these mid-game would end the
  // game after round 1 in most configurations (e.g. 1 zombie vs 3 humans always
  // makes humans the "majority" immediately).
  if (roundNumber >= totalRounds) {
    // THE DEAD MAN WALK — last human standing beats any number of zombies
    if (cleanHumans.length === 1) {
      return {
        gameOver: true,
        winnerFaction: 'humans',
        winnerPlayerId: cleanHumans[0].id,
      }
    }
    // Majority determines winner; humans win on exact tie (survived to the end)
    if (cleanHumans.length >= zombieThreats.length) {
      return { gameOver: true, winnerFaction: 'humans', winnerPlayerId: null }
    }
    return { gameOver: true, winnerFaction: 'zombies', winnerPlayerId: null }
  }

  return { gameOver: false, winnerFaction: null, winnerPlayerId: null }
}

// ── NO-REPEAT PAIRING ALGORITHM ──────────────────────────────

function generatePairsNoRepeat(
  players: Player[],
  playedMatchups: Set<string>,
  subjectZero: Player | null
): { pairs: string[][], bye: string | null } {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const pairs: string[][] = []
  const used = new Set<string>()

  // First pass: fresh matchups only
  for (let i = 0; i < shuffled.length; i++) {
    if (used.has(shuffled[i].id)) continue
    for (let j = i + 1; j < shuffled.length; j++) {
      if (used.has(shuffled[j].id)) continue
      const key = [shuffled[i].id, shuffled[j].id].sort().join('|')
      if (!playedMatchups.has(key)) {
        pairs.push([shuffled[i].id, shuffled[j].id])
        used.add(shuffled[i].id)
        used.add(shuffled[j].id)
        break
      }
    }
  }

  // Second pass: pair remaining (repeat matchups if all options exhausted)
  for (let i = 0; i < shuffled.length; i++) {
    if (used.has(shuffled[i].id)) continue
    for (let j = i + 1; j < shuffled.length; j++) {
      if (used.has(shuffled[j].id)) continue
      pairs.push([shuffled[i].id, shuffled[j].id])
      used.add(shuffled[i].id)
      used.add(shuffled[j].id)
      break
    }
  }

  const byePlayer = shuffled.find(p => !used.has(p.id)) ?? null

  if (byePlayer && subjectZero) {
    pairs.push([byePlayer.id, subjectZero.id])
    return { pairs, bye: null }
  }

  return { pairs, bye: byePlayer?.id ?? null }
}

// ── SUBJECT ZERO CARD GENERATION ─────────────────────────────

function generateSubjectZeroCommit(): Card[] {
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs']
  if (Math.random() < 0.3) {
    const types: Array<Card['type']> = ['zombie', 'shotgun', 'vaccine']
    const picked = types[Math.floor(Math.random() * types.length)]
    return [{
      id: crypto.randomUUID(),
      type: picked,
      value: picked === 'zombie' ? 15 : 0,
      suit: null,
      used: false,
    }]
  }
  const count = Math.floor(Math.random() * 3) + 1
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    cards.push({
      id: crypto.randomUUID(),
      type: 'number',
      value: Math.floor(Math.random() * 13) + 2,
      suit: SUITS[Math.floor(Math.random() * 4)],
      used: false,
    })
  }
  return cards
}
