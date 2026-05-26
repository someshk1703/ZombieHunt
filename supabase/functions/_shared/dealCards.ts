import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface Card {
  id: string
  type: 'number' | 'zombie' | 'shotgun' | 'vaccine'
  value: number
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null
  used: boolean
}

const SUITS: Array<'spades' | 'hearts' | 'diamonds' | 'clubs'> = ['spades', 'hearts', 'diamonds', 'clubs']

function secureRandom(): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] / (0xFFFFFFFF + 1)
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type SupabaseClient = ReturnType<typeof createClient>

export async function dealCards(
  supabase: SupabaseClient,
  players: { id: string; user_id?: string; is_bot?: boolean }[]
): Promise<{ totalPlayers: number; zombiePlayers: string[]; vaccineRecipients: string[]; handsDealt: boolean }> {
  const SUBJECT_ZERO_UUID = '00000000-0000-0000-0000-000000000000'

  // Lobby bots (is_bot=true but NOT Subject Zero) only get number cards.
  // Zombie/shotgun/vaccine cards are dealt exclusively among human players + Subject Zero
  // so that check-win (which excludes bots) always sees the correct zombie faction.
  const specialEligible = players.filter(p =>
    !p.is_bot || p.user_id === SUBJECT_ZERO_UUID
  )
  const lobbyBots = players.filter(p => p.is_bot && p.user_id !== SUBJECT_ZERO_UUID)

  const eligibleCount = specialEligible.length
  // At least 1 zombie for any game (3–9 eligible), +1 every 5 more
  const zombieCount = Math.min(Math.max(1, Math.floor(eligibleCount / 5)), Math.max(1, eligibleCount - 1))
  // At least 1 vaccine for any game (3–7 eligible), +1 every 4 more
  // Upper bound: can't exceed non-zombie players (0 if all eligibles are zombies)
  const vaccineCount = Math.min(Math.max(1, Math.floor(eligibleCount / 4)), eligibleCount - zombieCount)

  const shuffledEligible = shuffle(specialEligible)

  const zombiePlayerIds = new Set<string>()
  const vaccinePlayerIds = new Set<string>()
  const playerHands: Record<string, Card[]> = {}

  for (const p of players) playerHands[p.id] = []

  // Zombie cards — first zombieCount in shuffled eligible array (humans + Subject Zero only)
  for (let i = 0; i < zombieCount; i++) {
    const pid = shuffledEligible[i].id
    zombiePlayerIds.add(pid)
    playerHands[pid].push({ id: crypto.randomUUID(), type: 'zombie', value: 15, suit: null, used: false })
  }

  // Shotgun cards — all eligible non-zombies (NOT lobby bots)
  for (const p of specialEligible) {
    if (!zombiePlayerIds.has(p.id)) {
      playerHands[p.id].push({ id: crypto.randomUUID(), type: 'shotgun', value: 0, suit: null, used: false })
    }
  }

  // Vaccine cards — shuffle eligible non-zombies, first vaccineCount get one
  const nonZombies = shuffle(specialEligible.filter(p => !zombiePlayerIds.has(p.id)))
  for (let i = 0; i < vaccineCount; i++) {
    const pid = nonZombies[i].id
    vaccinePlayerIds.add(pid)
    playerHands[pid].push({ id: crypto.randomUUID(), type: 'vaccine', value: 0, suit: null, used: false })
  }

  // Fill remaining slots with number cards (target: 7 per player, including lobby bots)
  for (const p of players) {
    const hand = playerHands[p.id]
    const slots = 7 - hand.length
    for (let i = 0; i < slots; i++) {
      const value = Math.floor(secureRandom() * 13) + 2
      const suit = SUITS[Math.floor(secureRandom() * 4)]
      hand.push({ id: crypto.randomUUID(), type: 'number', value, suit, used: false })
    }
    playerHands[p.id] = shuffle(hand)
  }

  await Promise.all(players.map(p =>
    supabase.from('players').update({ hand: playerHands[p.id] }).eq('id', p.id)
  ))

  return {
    totalPlayers: players.length,
    zombiePlayers: [...zombiePlayerIds],
    vaccineRecipients: [...vaccinePlayerIds],
    handsDealt: true,
  }
}
