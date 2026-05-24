// deal-cards — exported as a pure function called inline from start-game
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
  players: { id: string }[]
): Promise<{ totalPlayers: number; zombiePlayers: string[]; vaccineRecipients: string[]; handsDealt: boolean }> {
  const playerCount = players.length
  const zombieCount = Math.floor(playerCount / 5)
  const vaccineCount = Math.floor(playerCount / 4)

  const shuffledPlayers = shuffle(players)

  const zombiePlayerIds = new Set<string>()
  const vaccinePlayerIds = new Set<string>()
  const playerHands: Record<string, Card[]> = {}

  for (const p of players) playerHands[p.id] = []

  // Zombie cards — first zombieCount in shuffled array
  for (let i = 0; i < zombieCount; i++) {
    const pid = shuffledPlayers[i].id
    zombiePlayerIds.add(pid)
    playerHands[pid].push({ id: crypto.randomUUID(), type: 'zombie', value: 15, suit: null, used: false })
  }

  // Shotgun cards — all non-zombies
  for (const p of players) {
    if (!zombiePlayerIds.has(p.id)) {
      playerHands[p.id].push({ id: crypto.randomUUID(), type: 'shotgun', value: 0, suit: null, used: false })
    }
  }

  // Vaccine cards — shuffle non-zombies, first vaccineCount get one
  const nonZombies = shuffle(players.filter(p => !zombiePlayerIds.has(p.id)))
  for (let i = 0; i < vaccineCount; i++) {
    const pid = nonZombies[i].id
    vaccinePlayerIds.add(pid)
    playerHands[pid].push({ id: crypto.randomUUID(), type: 'vaccine', value: 0, suit: null, used: false })
  }

  // Fill remaining slots with number cards (target: 7 per player)
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
    totalPlayers: playerCount,
    zombiePlayers: [...zombiePlayerIds],
    vaccineRecipients: [...vaccinePlayerIds],
    handsDealt: true,
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return new Response(JSON.stringify({ error: 'Use start-game to trigger card dealing' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
