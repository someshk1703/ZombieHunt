import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGameStore, Card } from '../store/gameStore'

export type GamePhase = 'deal' | 'hand_review' | 'blind_action' | 'reveal' | 'elimination_check' | 'finished'

export interface GamePlayer {
  id: string
  user_id: string
  username: string
  avatar_url: string
  is_host: boolean
  is_ready: boolean
  is_bot: boolean
  status: 'alive' | 'infected' | 'eliminated'
  lives: number
  hand: Card[]
}

export interface GameRoom {
  id: string
  code: string
  host_id: string
  status: 'lobby' | 'playing' | 'finished'
  settings: {
    room_name?: string
    max_players: number
    round_timer_seconds: number
    allow_spectators: boolean
    infection_visibility: boolean
    visibility: string
  }
}

export interface GameState {
  id: string
  room_id: string
  round_number: number
  phase: GamePhase
  pairs: string[][]
  bye_player_id: string | null
  committed_cards: Record<string, unknown>
  phase_deadline: string | null
  updated_at: string
}

interface GameContextValue {
  room: GameRoom
  players: GamePlayer[]
  myPlayer: GamePlayer
  gameState: GameState
  myHand: Card[]
  setMyHand: (cards: Card[]) => void
  isHost: boolean
  isGhost: boolean
  refreshPlayers: () => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}

interface GameProviderProps {
  room: GameRoom
  initialPlayers: GamePlayer[]
  gameState: GameState
  myPlayer: GamePlayer
  children: React.ReactNode
}

export function GameProvider({ room, initialPlayers, gameState: initialGameState, myPlayer: initialMyPlayer, children }: GameProviderProps) {
  const { user, myHand, setMyHand } = useGameStore()
  const [players, setPlayers] = useState<GamePlayer[]>(initialPlayers)
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [myPlayer, setMyPlayer] = useState<GamePlayer>(initialMyPlayer)
  const navigate = useNavigate()

  // Sync myHand from myPlayer.hand on mount
  useEffect(() => {
    if (initialMyPlayer.hand?.length) {
      setMyHand(initialMyPlayer.hand)
    }
  }, [])

  // Realtime: game_state updates
  useEffect(() => {
    const channel = supabase
      .channel(`gs-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state', filter: `room_id=eq.${room.id}` }, payload => {
        const updated = payload.new as GameState
        setGameState(updated)
        if (updated.phase === 'finished') navigate(`/results/${room.code}`)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room.id, room.code, navigate])

  // Realtime: own player row
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`myplayer-${myPlayer.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${myPlayer.id}` }, payload => {
        const updated = payload.new as GamePlayer
        setMyPlayer(updated)
        if (updated.hand?.length) setMyHand(updated.hand)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myPlayer.id, user, setMyHand])

  // Realtime: all players
  useEffect(() => {
    const channel = supabase
      .channel(`players-game-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, payload => {
        const updated = payload.new as GamePlayer
        setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
        if (updated.id === myPlayer.id) setMyPlayer(updated)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, payload => {
        setPlayers(prev => prev.filter(p => p.id !== (payload.old as GamePlayer).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room.id, myPlayer.id])

  async function refreshPlayers() {
    const { data } = await supabase.from('players').select('*').eq('room_id', room.id)
    if (data) setPlayers(data as GamePlayer[])
  }

  const isHost = myPlayer.is_host
  const isGhost = myPlayer.status === 'eliminated'

  return (
    <GameContext.Provider value={{ room, players, myPlayer, gameState, myHand, setMyHand, isHost, isGhost, refreshPlayers }}>
      {children}
    </GameContext.Provider>
  )
}
