import { create } from 'zustand'

export interface Card {
  id: string
  type: 'number' | 'zombie' | 'shotgun' | 'vaccine'
  value: number
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null
  used: boolean
}

interface CurrentRoom {
  id: string
  code: string
  status: 'lobby' | 'playing' | 'finished'
}

interface GhostData {
  allHands: Record<string, Card[]>
  allInfections: Record<string, boolean>
}

interface GameStore {
  // Auth
  user: { id: string } | null

  // Player identity (session only — no persistence)
  username: string | null
  avatarUrl: string | null

  // Room
  currentRoom: CurrentRoom | null

  // Pending room code (set when visiting /room/:code without a username)
  pendingRoomCode: string | null

  // Game session
  myHand: Card[]
  ghostData: GhostData | null

  // Actions
  setUser: (user: { id: string } | null) => void
  setPlayerIdentity: (username: string, avatarUrl: string) => void
  setCurrentRoom: (room: CurrentRoom | null) => void
  setPendingRoomCode: (code: string | null) => void
  setMyHand: (cards: Card[]) => void
  setGhostData: (data: GhostData | null) => void
  clearIdentity: () => void
}

function buildAvatarUrl(username: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}&backgroundColor=0a0a0a`
}

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  username: null,
  avatarUrl: null,
  currentRoom: null,
  pendingRoomCode: null,
  myHand: [],
  ghostData: null,

  setUser: (user) => set({ user }),
  setPlayerIdentity: (username, avatarUrl) => set({ username, avatarUrl }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setPendingRoomCode: (code) => set({ pendingRoomCode: code }),
  setMyHand: (cards) => set({ myHand: cards }),
  setGhostData: (data) => set({ ghostData: data }),
  clearIdentity: () =>
    set({ username: null, avatarUrl: null, currentRoom: null, pendingRoomCode: null, myHand: [], ghostData: null }),
}))

export { buildAvatarUrl }
