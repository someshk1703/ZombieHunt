/**
 * validate-scenarios.ts
 * ---------------------
 * Deterministic validation of Scenario 1, 2, and 3 from GameRule.txt.
 * Pure-function port of resolve-round logic — no DB, no randomness.
 *
 * Run with:
 *   npx tsx scripts/validate-scenarios.ts
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = 'number' | 'zombie' | 'shotgun' | 'vaccine'
type PlayerStatus = 'alive' | 'infected' | 'eliminated'

interface Card {
  id: string
  type: CardType
  value: number
  used: boolean
}

interface Player {
  id: string
  name: string
  status: PlayerStatus
  hand: Card[]
}

interface RoundOutcome {
  playerA: string
  playerB: string
  event: 'numeric' | 'infection' | 'elimination' | 'vaccine_cure' | 'draw'
  winnerId: string | null
  loserId: string | null
  infectedId?: string
  infectorId?: string
  eliminatedId?: string
  curedId?: string
  totalA: number
  totalB: number
}

// ─── Pure helpers (mirroring resolve-round logic exactly) ─────────────────────

let _idCounter = 1
function makeId(): string { return `card-${_idCounter++}` }

function num(value: number): Card {
  return { id: makeId(), type: 'number', value, used: false }
}
function zombie(): Card { return { id: makeId(), type: 'zombie', value: 0, used: false } }
function shotgun(): Card { return { id: makeId(), type: 'shotgun', value: 0, used: false } }
function vaccine(): Card { return { id: makeId(), type: 'vaccine', value: 0, used: false } }

function numericTotal(cards: Card[]): number {
  return cards.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
}

function resolveNumeric(cardsA: Card[], cardsB: Card[], pA: Player, pB: Player): RoundOutcome {
  const totalA = numericTotal(cardsA)
  const totalB = numericTotal(cardsB)
  if (totalA > totalB) return { playerA: pA.id, playerB: pB.id, event: 'numeric', winnerId: pA.id, loserId: pB.id, totalA, totalB }
  if (totalB > totalA) return { playerA: pA.id, playerB: pB.id, event: 'numeric', winnerId: pB.id, loserId: pA.id, totalA, totalB }
  return { playerA: pA.id, playerB: pB.id, event: 'draw', winnerId: null, loserId: null, totalA, totalB }
}

function resolveSpecialCards(cardsA: Card[], cardsB: Card[], pA: Player, pB: Player): RoundOutcome {
  const sA = cardsA.find(c => c.type !== 'number')
  const sB = cardsB.find(c => c.type !== 'number')

  // Both zombie — numeric tiebreak
  if (sA?.type === 'zombie' && sB?.type === 'zombie') return resolveNumeric(cardsA, cardsB, pA, pB)

  // Shotgun eliminates infected opponent
  if (sA?.type === 'shotgun' && pB.status === 'infected')
    return { playerA: pA.id, playerB: pB.id, event: 'elimination', winnerId: pA.id, loserId: pB.id, eliminatedId: pB.id, totalA: 0, totalB: 0 }
  if (sB?.type === 'shotgun' && pA.status === 'infected')
    return { playerA: pA.id, playerB: pB.id, event: 'elimination', winnerId: pB.id, loserId: pA.id, eliminatedId: pA.id, totalA: 0, totalB: 0 }

  // Vaccine cures infected opponent (by alive player)
  if (sA?.type === 'vaccine' && pA.status === 'alive' && pB.status === 'infected')
    return { playerA: pA.id, playerB: pB.id, event: 'vaccine_cure', winnerId: pA.id, loserId: pB.id, curedId: pB.id, totalA: 0, totalB: 0 }
  if (sB?.type === 'vaccine' && pB.status === 'alive' && pA.status === 'infected')
    return { playerA: pA.id, playerB: pB.id, event: 'vaccine_cure', winnerId: pB.id, loserId: pA.id, curedId: pA.id, totalA: 0, totalB: 0 }

  // Zombie infects alive opponent
  if (sA?.type === 'zombie' && pB.status === 'alive')
    return { playerA: pA.id, playerB: pB.id, event: 'infection', winnerId: pA.id, loserId: pB.id, infectedId: pB.id, infectorId: pA.id, totalA: 0, totalB: 0 }
  if (sB?.type === 'zombie' && pA.status === 'alive')
    return { playerA: pA.id, playerB: pB.id, event: 'infection', winnerId: pB.id, loserId: pA.id, infectedId: pA.id, infectorId: pB.id, totalA: 0, totalB: 0 }

  // Fallback — numeric
  return resolveNumeric(cardsA, cardsB, pA, pB)
}

function removeOneCard(hand: Card[], committed: Card[]): Card[] {
  const committedIds = new Set(committed.map(c => c.id))
  const committedNumber = hand.find(c => committedIds.has(c.id) && c.type === 'number')
  if (committedNumber) return hand.filter(c => c.id !== committedNumber.id)
  const anyNumber = hand.find(c => c.type === 'number')
  if (anyNumber) return hand.filter(c => c.id !== anyNumber.id)
  const nonZombie = hand.find(c => c.type !== 'zombie')
  if (nonZombie) return hand.filter(c => c.id !== nonZombie.id)
  return hand
}

function buildInfectedHand(hand: Card[], committed: Card[]): Card[] {
  const zCard: Card = { id: makeId(), type: 'zombie', value: 0, used: false }
  const reduced = removeOneCard(hand, committed)
  return [...reduced, zCard]
}

/** Apply one round's duel outcomes to the player map. Returns updated map. */
function applyOutcomes(
  players: Map<string, Player>,
  duels: { pA: Player; pB: Player; cardsA: Card[]; cardsB: Card[] }[]
): RoundOutcome[] {
  const outcomes: RoundOutcome[] = []

  for (const duel of duels) {
    const pA = players.get(duel.pA.id)!
    const pB = players.get(duel.pB.id)!
    const outcome = resolveSpecialCards(duel.cardsA, duel.cardsB, pA, pB)
    outcomes.push(outcome)

    // Consume shotgun / vaccine from hands
    const usedIdsA = new Set(duel.cardsA.filter(c => c.type === 'shotgun' || c.type === 'vaccine').map(c => c.id))
    const usedIdsB = new Set(duel.cardsB.filter(c => c.type === 'shotgun' || c.type === 'vaccine').map(c => c.id))
    let newHandA = pA.hand.filter(c => !usedIdsA.has(c.id))
    let newHandB = pB.hand.filter(c => !usedIdsB.has(c.id))

    if (outcome.event === 'infection') {
      if (outcome.infectedId === pA.id) {
        newHandA = buildInfectedHand(newHandA, duel.cardsA)
        players.set(pA.id, { ...pA, status: 'infected', hand: newHandA })
      } else {
        newHandB = buildInfectedHand(newHandB, duel.cardsB)
        players.set(pB.id, { ...pB, status: 'infected', hand: newHandB })
      }
    } else if (outcome.event === 'elimination') {
      if (outcome.eliminatedId === pA.id) {
        players.set(pA.id, { ...pA, status: 'eliminated', hand: newHandA })
        players.set(pB.id, { ...pB, hand: newHandB })
      } else {
        players.set(pB.id, { ...pB, status: 'eliminated', hand: newHandB })
        players.set(pA.id, { ...pA, hand: newHandA })
      }
    } else if (outcome.event === 'vaccine_cure') {
      if (outcome.curedId === pA.id) {
        newHandA = newHandA.filter(c => c.type !== 'zombie')
        players.set(pA.id, { ...pA, status: 'alive', hand: newHandA })
        players.set(pB.id, { ...pB, hand: newHandB })
      } else {
        newHandB = newHandB.filter(c => c.type !== 'zombie')
        players.set(pB.id, { ...pB, status: 'alive', hand: newHandB })
        players.set(pA.id, { ...pA, hand: newHandA })
      }
    } else if (outcome.event === 'numeric' && outcome.loserId) {
      if (outcome.loserId === pA.id) {
        newHandA = removeOneCard(newHandA, duel.cardsA)
        players.set(pA.id, { ...pA, hand: newHandA })
        players.set(pB.id, { ...pB, hand: newHandB })
      } else {
        newHandB = removeOneCard(newHandB, duel.cardsB)
        players.set(pB.id, { ...pB, hand: newHandB })
        players.set(pA.id, { ...pA, hand: newHandA })
      }
    } else {
      players.set(pA.id, { ...pA, hand: newHandA })
      players.set(pB.id, { ...pB, hand: newHandB })
    }
  }

  return outcomes
}

function countFactions(players: Map<string, Player>) {
  const alive = [...players.values()].filter(p => p.status !== 'eliminated')
  return {
    infected: alive.filter(p => p.status === 'infected').length,
    normal: alive.filter(p => p.status === 'alive').length,
  }
}

function checkWin(players: Map<string, Player>): 'HUMANITY PREVAILS' | 'ZOMBIES WON' | null {
  const { infected, normal } = countFactions(players)
  if (infected === 0 && normal > 0) return 'HUMANITY PREVAILS'
  if (normal === 0) return 'ZOMBIES WON'
  return null
}

// ─── Reporting ────────────────────────────────────────────────────────────────

let passCount = 0
let failCount = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    passCount++
    console.log(`  ✓  ${label}`)
  } else {
    failCount++
    console.log(`  ✗  ${label}`)
    console.log(`       expected: ${JSON.stringify(expected)}`)
    console.log(`       actual  : ${JSON.stringify(actual)}`)
  }
}

function printFactions(players: Map<string, Player>, round: number) {
  const { infected, normal } = countFactions(players)
  const nonElim = [...players.values()].filter(p => p.status !== 'eliminated')
  console.log(`     After round ${round}: ${infected} infected, ${normal} normal  (${nonElim.map(p => `${p.name}[${p.status.slice(0,1).toUpperCase()}]`).join(' ')})`)
}

// ─── SCENARIO 1 ───────────────────────────────────────────────────────────────
// Expected outcome: HUMANITY PREVAILS
{
  console.log('\n═══════════════════════════════════════')
  console.log(' SCENARIO 1  — HUMANITY PREVAILS')
  console.log('═══════════════════════════════════════')

  const pA: Player = { id: 'A', name: 'PlayerA[Infected]', status: 'infected',
    hand: [zombie(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pB: Player = { id: 'B', name: 'PlayerB', status: 'alive',
    hand: [vaccine(), shotgun(), num(3), num(4), num(5), num(6), num(7)] }
  const pC: Player = { id: 'C', name: 'PlayerC', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pD: Player = { id: 'D', name: 'PlayerD', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }

  const players = new Map<string, Player>([['A', pA], ['B', pB], ['C', pC], ['D', pD]])

  // ── Round 1 ──────────────────────────────────────────────────────────────
  console.log('\n  Round 1: A vs D (zombie beats normals) | B vs C (shotgun beats normals → C wins total)')

  // A plays zombie card; D plays two normal cards
  const aZombie = pA.hand.find(c => c.type === 'zombie')!
  const dNormals = pD.hand.filter(c => c.type === 'number').slice(0, 2)

  // B plays shotgun; C plays two normal cards — shotgun vs alive = falls through to numeric
  // B's shotgun plays but D is alive, so shotgun is useless → numeric: C has higher total
  const bShotgun = pB.hand.find(c => c.type === 'shotgun')!
  const cNormals = pC.hand.filter(c => c.type === 'number').slice(0, 2)
  // Give C higher total than B's 0-numeric to ensure C wins
  const r1 = applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('D')!, cardsA: [aZombie], cardsB: dNormals },
    { pA: players.get('B')!, pB: players.get('C')!, cardsA: [bShotgun], cardsB: cNormals },
  ])

  assert('R1: A infects D', r1[0].event, 'infection')
  assert('R1: D is the infected target', r1[0].infectedId, 'D')
  assert('R1: B vs C → shotgun vs alive falls to numeric → C wins (C has numbers, B has none)', r1[1].event, 'numeric')
  assert('R1: C wins the numeric duel', r1[1].winnerId, 'C')
  printFactions(players, 1)
  const { infected: i1, normal: n1 } = countFactions(players)
  assert('R1 end: 2 infected, 2 normal', { infected: i1, normal: n1 }, { infected: 2, normal: 2 })

  // ── Round 2 ──────────────────────────────────────────────────────────────
  console.log('\n  Round 2: A vs C (C shoots infected A → eliminated) | D vs B (B uses vaccine on D → D cured)')

  // C plays shotgun on infected A → elimination
  const cShotgun = players.get('C')!.hand.find(c => c.type === 'shotgun')!
  const aNormal = players.get('A')!.hand.filter(c => c.type === 'number').slice(0, 2)

  // D plays zombie but B plays vaccine → cure
  const dZombie = players.get('D')!.hand.find(c => c.type === 'zombie')!
  const bVaccine = players.get('B')!.hand.find(c => c.type === 'vaccine')!

  const r2 = applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('C')!, cardsA: aNormal, cardsB: [cShotgun] },
    { pA: players.get('D')!, pB: players.get('B')!, cardsA: [dZombie], cardsB: [bVaccine] },
  ])

  assert('R2: C eliminates A (shotgun on infected)', r2[0].event, 'elimination')
  assert('R2: A is eliminated', r2[0].eliminatedId, 'A')
  assert('R2: B cures D (vaccine)', r2[1].event, 'vaccine_cure')
  assert('R2: D is cured', r2[1].curedId, 'D')
  printFactions(players, 2)
  const { infected: i2, normal: n2 } = countFactions(players)
  assert('R2 end: 0 infected, 3 normal', { infected: i2, normal: n2 }, { infected: 0, normal: 3 })

  const result1 = checkWin(players)
  assert('SCENARIO 1 RESULT: HUMANITY PREVAILS', result1, 'HUMANITY PREVAILS')
}

// ─── SCENARIO 2 ───────────────────────────────────────────────────────────────
// Same as Scenario 1 but A plays normals in R2 (not zombie). Infected status
// is determined by having zombie in deck, not by what was played.
// Expected outcome: HUMANITY PREVAILS
{
  console.log('\n═══════════════════════════════════════')
  console.log(' SCENARIO 2  — HUMANITY PREVAILS (A plays normals in R2 — still eliminated)')
  console.log('═══════════════════════════════════════')

  const pA: Player = { id: 'A', name: 'PlayerA[Infected]', status: 'infected',
    hand: [zombie(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pB: Player = { id: 'B', name: 'PlayerB', status: 'alive',
    hand: [vaccine(), shotgun(), num(3), num(4), num(5), num(6), num(7)] }
  const pC: Player = { id: 'C', name: 'PlayerC', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pD: Player = { id: 'D', name: 'PlayerD', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }

  const players = new Map<string, Player>([['A', pA], ['B', pB], ['C', pC], ['D', pD]])

  // Round 1 — identical to Scenario 1
  const aZombie = pA.hand.find(c => c.type === 'zombie')!
  const dNormals = pD.hand.filter(c => c.type === 'number').slice(0, 2)
  const bShotgun = pB.hand.find(c => c.type === 'shotgun')!
  const cNormals = pC.hand.filter(c => c.type === 'number').slice(0, 2)
  applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('D')!, cardsA: [aZombie], cardsB: dNormals },
    { pA: players.get('B')!, pB: players.get('C')!, cardsA: [bShotgun], cardsB: cNormals },
  ])

  // Round 2 — A plays NORMALS (not zombie), C still uses shotgun → A is infected so still eliminated
  console.log('\n  Round 2: A plays normals (not zombie) — still infected, C shotguns A')
  const cShotgun = players.get('C')!.hand.find(c => c.type === 'shotgun')!
  const aNormals = players.get('A')!.hand.filter(c => c.type === 'number').slice(0, 2)
  const dZombie = players.get('D')!.hand.find(c => c.type === 'zombie')!
  const bVaccine = players.get('B')!.hand.find(c => c.type === 'vaccine')!

  const r2 = applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('C')!, cardsA: aNormals, cardsB: [cShotgun] },
    { pA: players.get('D')!, pB: players.get('B')!, cardsA: [dZombie], cardsB: [bVaccine] },
  ])

  assert('R2: C eliminates infected A even though A played normals', r2[0].event, 'elimination')
  assert('R2: A is eliminated', r2[0].eliminatedId, 'A')
  assert('R2: D vs B → vaccine cures D', r2[1].event, 'vaccine_cure')
  printFactions(players, 2)
  const { infected: i2, normal: n2 } = countFactions(players)
  assert('R2 end: 0 infected, 3 normal', { infected: i2, normal: n2 }, { infected: 0, normal: 3 })

  const result2 = checkWin(players)
  assert('SCENARIO 2 RESULT: HUMANITY PREVAILS', result2, 'HUMANITY PREVAILS')
}

// ─── SCENARIO 3A ──────────────────────────────────────────────────────────────
// D infects B in R2 | Round 3: C vs D, D infects C → all infected
// Expected: ZOMBIES WON
{
  console.log('\n═══════════════════════════════════════')
  console.log(' SCENARIO 3A — ZOMBIES WON (C gets infected by D in R3)')
  console.log('═══════════════════════════════════════')

  const pA: Player = { id: 'A', name: 'PlayerA[Infected]', status: 'infected',
    hand: [zombie(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pB: Player = { id: 'B', name: 'PlayerB', status: 'alive',
    hand: [vaccine(), shotgun(), num(3), num(4), num(5), num(6), num(7)] }
  const pC: Player = { id: 'C', name: 'PlayerC', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pD: Player = { id: 'D', name: 'PlayerD', status: 'alive',
    hand: [shotgun(), num(3), num(4), num(5), num(6), num(7), num(8)] }

  const players = new Map<string, Player>([['A', pA], ['B', pB], ['C', pC], ['D', pD]])

  // Round 1
  const aZombie = pA.hand.find(c => c.type === 'zombie')!
  const dNormals = pD.hand.filter(c => c.type === 'number').slice(0, 2)
  const bShotgun = pB.hand.find(c => c.type === 'shotgun')!
  const cNormals = pC.hand.filter(c => c.type === 'number').slice(0, 2)
  applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('D')!, cardsA: [aZombie], cardsB: dNormals },
    { pA: players.get('B')!, pB: players.get('C')!, cardsA: [bShotgun], cardsB: cNormals },
  ])

  // Round 2: A vs C (C shoots A — elimination) | D vs B (D plays zombie, B plays normals → B infected)
  console.log('\n  Round 2: C eliminates A | D infects B')
  const cShotgun = players.get('C')!.hand.find(c => c.type === 'shotgun')!
  const aNormals = players.get('A')!.hand.filter(c => c.type === 'number').slice(0, 2)
  const dZombie = players.get('D')!.hand.find(c => c.type === 'zombie')!
  const bNormals = players.get('B')!.hand.filter(c => c.type === 'number').slice(0, 2)

  const r2 = applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('C')!, cardsA: aNormals, cardsB: [cShotgun] },
    { pA: players.get('D')!, pB: players.get('B')!, cardsA: [dZombie], cardsB: bNormals },
  ])

  assert('R2: C eliminates A', r2[0].event, 'elimination')
  assert('R2: D infects B', r2[1].event, 'infection')
  assert('R2: B is infected', r2[1].infectedId, 'B')
  printFactions(players, 2)
  const { infected: i2, normal: n2 } = countFactions(players)
  assert('R2 end: 2 infected (D,B), 1 normal (C)', { infected: i2, normal: n2 }, { infected: 2, normal: 1 })
  assert('R2: no win yet', checkWin(players), null)

  // Round 3: C vs D (B gets bye — already played C). D plays zombie, C plays normals → C infected
  console.log('\n  Round 3: C vs D (B bye) — D infects C')
  const dZombie2 = players.get('D')!.hand.find(c => c.type === 'zombie')!
  const cNormals2 = players.get('C')!.hand.filter(c => c.type === 'number').slice(0, 2)

  const r3 = applyOutcomes(players, [
    { pA: players.get('D')!, pB: players.get('C')!, cardsA: [dZombie2], cardsB: cNormals2 },
  ])

  assert('R3: D infects C', r3[0].event, 'infection')
  assert('R3: C is infected', r3[0].infectedId, 'C')
  printFactions(players, 3)
  const { infected: i3, normal: n3 } = countFactions(players)
  assert('R3 end: 3 infected, 0 normal', { infected: i3, normal: n3 }, { infected: 3, normal: 0 })

  const result3a = checkWin(players)
  assert('SCENARIO 3A RESULT: ZOMBIES WON', result3a, 'ZOMBIES WON')
}

// ─── SCENARIO 3B ──────────────────────────────────────────────────────────────
// Round 3: D plays normal (not zombie) — C wins numerically, D loses a card.
// 2 infected remain (D, B), 1 normal (C) → still ZOMBIES WON
{
  console.log('\n═══════════════════════════════════════')
  console.log(' SCENARIO 3B — ZOMBIES WON (D plays normal in R3 — C wins, but zombies outnumber humans)')
  console.log('═══════════════════════════════════════')

  const pA: Player = { id: 'A', name: 'PlayerA[Infected]', status: 'infected',
    hand: [zombie(), num(3), num(4), num(5), num(6), num(7), num(8)] }
  const pB: Player = { id: 'B', name: 'PlayerB', status: 'alive',
    hand: [vaccine(), shotgun(), num(3), num(4), num(5), num(6), num(7)] }
  const pC: Player = { id: 'C', name: 'PlayerC', status: 'alive',
    hand: [shotgun(), num(5), num(6), num(7), num(8), num(9), num(10)] }
  const pD: Player = { id: 'D', name: 'PlayerD', status: 'alive',
    hand: [shotgun(), num(2), num(3), num(4), num(5), num(6), num(7)] }

  const players = new Map<string, Player>([['A', pA], ['B', pB], ['C', pC], ['D', pD]])

  // Round 1
  const aZombie = pA.hand.find(c => c.type === 'zombie')!
  const dNormals = pD.hand.filter(c => c.type === 'number').slice(0, 2)
  const bShotgun = pB.hand.find(c => c.type === 'shotgun')!
  const cNormals = pC.hand.filter(c => c.type === 'number').slice(0, 2)
  applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('D')!, cardsA: [aZombie], cardsB: dNormals },
    { pA: players.get('B')!, pB: players.get('C')!, cardsA: [bShotgun], cardsB: cNormals },
  ])

  // Round 2
  const cShotgun = players.get('C')!.hand.find(c => c.type === 'shotgun')!
  const aNormals = players.get('A')!.hand.filter(c => c.type === 'number').slice(0, 2)
  const dZombie = players.get('D')!.hand.find(c => c.type === 'zombie')!
  const bNormals = players.get('B')!.hand.filter(c => c.type === 'number').slice(0, 2)
  applyOutcomes(players, [
    { pA: players.get('A')!, pB: players.get('C')!, cardsA: aNormals, cardsB: [cShotgun] },
    { pA: players.get('D')!, pB: players.get('B')!, cardsA: [dZombie], cardsB: bNormals },
  ])

  // Round 3: D plays ONE normal (not zombie). C plays two normals with higher value. C wins.
  // D retains zombie but loses one played normal card. C retains all cards.
  console.log('\n  Round 3: C vs D (B bye) — D plays normal, C wins numerically')
  const dNormal3 = players.get('D')!.hand.filter(c => c.type === 'number').slice(0, 1)    // D plays 1 low-value normal
  const cNormals3 = players.get('C')!.hand.filter(c => c.type === 'number').slice(0, 2)   // C plays 2 high-value normals
  // C's 2 numbers will beat D's 1 number (C has 5+6=11 vs D has 2 )

  const r3 = applyOutcomes(players, [
    { pA: players.get('C')!, pB: players.get('D')!, cardsA: cNormals3, cardsB: dNormal3 },
  ])

  assert('R3: numeric duel', r3[0].event, 'numeric')
  assert('R3: C wins the duel', r3[0].winnerId, 'C')
  assert('R3: D loses a card (C retains all)', players.get('D')!.hand.length < 7, true)
  printFactions(players, 3)
  const { infected: i3, normal: n3 } = countFactions(players)
  // 2 infected (D, B) remain, 1 normal (C) → zombies majority → ZOMBIES WON
  assert('R3 end: 2 infected, 1 normal (zombies have majority)', { infected: i3, normal: n3 }, { infected: 2, normal: 1 })

  // Game ends because rounds are exhausted — zombies outnumber humans
  const result3b = i3 > n3 ? 'ZOMBIES WON' : 'HUMANITY PREVAILS'
  assert('SCENARIO 3B RESULT: ZOMBIES WON (zombies outnumber humans)', result3b, 'ZOMBIES WON')
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════')
console.log(` RESULTS: ${passCount} passed, ${failCount} failed`)
console.log('═══════════════════════════════════════\n')

if (failCount > 0) {
  process.exit(1)
}
