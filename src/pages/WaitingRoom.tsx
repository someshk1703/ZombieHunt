import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import AtmosphericBackground from '../components/AtmosphericBackground'
import PlayerRing from '../components/PlayerRing'
import LobbyChat from '../components/LobbyChat'
import RoomInfo from '../components/RoomInfo'
import SettingsDrawer from '../components/SettingsDrawer'
import JoinRoomModal from '../components/JoinRoomModal'
import { Copy } from 'lucide-react'

interface RoomSettings {
  room_name?: string
  max_players: number
  round_timer_seconds: number
  allow_spectators: boolean
  infection_visibility: boolean
  visibility: string
  countdown_started_at?: string | null
}

interface Room {
  id: string
  code: string
  host_id: string
  status: 'lobby' | 'playing' | 'finished'
  settings: RoomSettings
}

interface Player {
  id: string
  user_id: string
  username: string
  avatar_url: string
  is_host: boolean
  is_ready: boolean
  created_at: string
}

interface ChatMessage {
  id: string
  user_id: string
  username: string
  avatar_url: string
  message: string | null
  reaction: string | null
  type: 'message' | 'reaction' | 'system'
  created_at: string
}

export default function WaitingRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, username, setPendingRoomCode, setCurrentRoom } = useGameStore()
  const { showToast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [initialChat, setInitialChat] = useState<ChatMessage[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isHost = useMemo(() => players.find(p => p.user_id === user?.id)?.is_host ?? false, [players, user])
  const myPlayer = useMemo(() => players.find(p => p.user_id === user?.id), [players, user])
  const readyCount = useMemo(() => players.filter(p => p.is_ready).length, [players])
  const allReady = readyCount === players.length && players.length >= 3
  const hostPlayer = useMemo(() => players.find(p => p.is_host), [players])

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) { navigate('/'); return }

    async function init() {
      const upperCode = code!.toUpperCase()

      const { data: roomData, error: roomErr } = await supabase
        .from('rooms').select('*').eq('code', upperCode).single()

      if (roomErr || !roomData) {
        showToast('Room not found.', 'error')
        navigate('/')
        return
      }

      if (roomData.status === 'playing') { navigate(`/game/${upperCode}`); return }
      if (roomData.status === 'finished') { navigate(`/results/${upperCode}`); return }

      setRoom(roomData)
      setCurrentRoom({ id: roomData.id, code: roomData.code, status: roomData.status })

      const { data: playerData } = await supabase
        .from('players').select('*').eq('room_id', roomData.id)
        .order('created_at', { ascending: true })

      const playerList: Player[] = playerData ?? []
      setPlayers(playerList)

      if (user && !playerList.some(p => p.user_id === user.id)) {
        setShowJoinModal(true)
        setLoading(false)
        return
      }

      const { data: chatData } = await supabase
        .from('room_chat').select('*').eq('room_id', roomData.id)
        .order('created_at', { ascending: true }).limit(50)

      setInitialChat(chatData ?? [])

      const csa = roomData.settings?.countdown_started_at
      if (csa) {
        const elapsed = Math.floor((Date.now() - new Date(csa).getTime()) / 1000)
        const remaining = 10 - elapsed
        if (remaining > 0) setCountdown(remaining)
      }

      setLoading(false)
    }

    if (user !== undefined) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user])

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return

    const playersChannel = supabase
      .channel(`players-${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, payload => {
        const p = payload.new as Player
        setPlayers(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p])
        showToast(`${p.username} has entered the arena`, 'info')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, payload => {
        const p = payload.new as Player
        setPlayers(prev => prev.map(x => x.id === p.id ? p : x))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, payload => {
        const p = payload.old as Player
        setPlayers(prev => prev.filter(x => x.id !== p.id))
        showToast(`${p.username} has left`, 'info')
      })
      .subscribe()

    const roomsChannel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, payload => {
        const updated = payload.new as Room
        setRoom(updated)
        if (updated.status === 'playing') { navigate(`/game/${code}`); return }
        if (updated.status === 'finished') { navigate(`/results/${code}`); return }

        const csa = updated.settings?.countdown_started_at
        if (csa) {
          const elapsed = Math.floor((Date.now() - new Date(csa).getTime()) / 1000)
          const remaining = 10 - elapsed
          if (remaining > 0) setCountdown(remaining)
        } else {
          setCountdown(null)
          if (countdownRef.current) clearInterval(countdownRef.current)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(roomsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])

  // ── Countdown interval ────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown === null) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          if (isHost && room) triggerStartGame(room.id)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown !== null ? 'active' : 'inactive'])

  // ── Auto-start countdown when all ready (host only) ───────────────────────
  const allReadyRef = useRef(allReady)
  allReadyRef.current = allReady
  useEffect(() => {
    if (!room || !isHost) return
    if (allReady && countdown === null) {
      const now = new Date().toISOString()
      supabase.from('room_chat').insert({
        room_id: room.id, user_id: user!.id, username: 'SYSTEM', avatar_url: '',
        message: 'All survivors ready. Game begins in 10 seconds...',
        reaction: null, type: 'system',
      })
      supabase.from('rooms').update({
        settings: { ...room.settings, countdown_started_at: now },
      }).eq('id', room.id)
    }
    if (!allReady && countdown !== null) handleCancelCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReady])

  // ── Actions ───────────────────────────────────────────────────────────────
  async function triggerStartGame(roomId: string) {
    await supabase.functions.invoke('start-game', {
      body: { room_id: roomId, host_id: user?.id },
    })
  }

  async function handleReadyToggle() {
    if (!myPlayer) return
    await supabase.from('players').update({ is_ready: !myPlayer.is_ready }).eq('id', myPlayer.id)
  }

  async function handleKick(target: Player) {
    if (!room) return
    await supabase.from('players').delete().eq('id', target.id)
    await supabase.from('room_chat').insert({
      room_id: room.id, user_id: user!.id, username: 'SYSTEM', avatar_url: '',
      message: `${target.username} was removed by the host.`,
      reaction: null, type: 'system',
    })
  }

  async function handleCancelCountdown() {
    if (!room) return
    setCountdown(null)
    if (countdownRef.current) clearInterval(countdownRef.current)
    await supabase.from('players').update({ is_ready: false }).eq('room_id', room.id)
    await supabase.from('rooms').update({
      settings: { ...room.settings, countdown_started_at: null },
    }).eq('id', room.id)
    await supabase.from('room_chat').insert({
      room_id: room.id, user_id: user!.id, username: 'SYSTEM', avatar_url: '',
      message: 'Host cancelled the countdown.',
      reaction: null, type: 'system',
    })
  }

  const handleForceStart = useCallback(() => {
    if (room) triggerStartGame(room.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  async function handleLeave() {
    if (!myPlayer || !room) return
    if (isHost) {
      // Transfer host to next player, or delete room if alone
      const others = players.filter(p => p.user_id !== user?.id)
      if (others.length > 0) {
        await supabase.from('players').update({ is_host: true }).eq('id', others[0].id)
        await supabase.from('rooms').update({ host_id: others[0].user_id }).eq('id', room.id)
      } else {
        await supabase.from('rooms').delete().eq('id', room.id)
      }
    }
    await supabase.from('players').delete().eq('id', myPlayer.id)
    navigate('/')
  }

  function copyCode() {
    if (!room) return
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 500)
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!username) {
    setPendingRoomCode(code?.toUpperCase() ?? null)
    navigate('/', { replace: true })
    return null
  }

  if (showJoinModal) {
    return <JoinRoomModal initialCode={code?.toUpperCase()} canClose={false} />
  }

  if (loading || !room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
          LOADING...
        </span>
      </div>
    )
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AtmosphericBackground />

      {isHost && room.status === 'lobby' && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          roomId={room.id}
          currentSettings={room.settings}
          currentPlayerCount={players.length}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Room header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px',
        }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '32px', color: 'var(--color-text)', letterSpacing: '0.05em' }}>
              {room.settings.room_name ?? 'LOBBY'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
                CODE: {room.code}
              </span>
              <button
                onClick={copyCode}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: codeCopied ? 'var(--color-red)' : 'var(--color-text-muted)',
                  transition: 'color 150ms',
                }}
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isHost && room.status === 'lobby' && (
              <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setDrawerOpen(true)}>
                ⚙ SETTINGS
              </button>
            )}
            <button
              className="btn-secondary"
              style={{ fontSize: '12px', borderColor: 'var(--color-red)', color: 'var(--color-red)' }}
              onClick={handleLeave}
            >
              ✕ LEAVE
            </button>
          </div>
        </div>

        {/* Three-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'clamp(220px, 25%, 280px) 1fr clamp(220px, 25%, 280px)',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* Left — Chat */}
          <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <LobbyChat roomId={room.id} initialMessages={initialChat} />
          </div>

          {/* Center — Player ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <PlayerRing
              players={players}
              maxPlayers={room.settings.max_players}
              currentUserId={user?.id}
              isHost={isHost}
              countdown={countdown}
              readyCount={readyCount}
              onKick={handleKick}
              onReadyToggle={handleReadyToggle}
              onForceStart={handleForceStart}
              onCancelCountdown={handleCancelCountdown}
            />
          </div>

          {/* Right — Room info */}
          <div>
            <RoomInfo
              roomCode={room.code}
              settings={room.settings}
              playerCount={players.length}
              hostUsername={hostPlayer?.username ?? ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
