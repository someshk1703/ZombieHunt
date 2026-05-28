import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { audioManager } from '../lib/audio'
import AtmosphericBackground from '../components/AtmosphericBackground'
import LobbyChat from '../components/LobbyChat'
import SettingsDrawer from '../components/SettingsDrawer'
import JoinRoomModal from '../components/JoinRoomModal'
import { Copy } from 'lucide-react'
import DevPanel from '../components/DevPanel'

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
  is_bot?: boolean
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
  const [linkCopied, setLinkCopied] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commsOpen, setCommsOpen] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [kickConfirmId, setKickConfirmId] = useState<string | null>(null)

  function cardDistribution(count: number) {
    const zombieCount = Math.min(Math.max(1, Math.floor(count / 5)), count - 1)
    const vaccineCount = Math.min(Math.max(1, Math.floor(count / 4)), count - zombieCount)
    return {
      zombieCount,
      vaccineCount,
      shotgunCount: count - zombieCount,
    }
  }

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isHost = useMemo(() => players.find(p => p.user_id === user?.id)?.is_host ?? false, [players, user])
  const myPlayer = useMemo(() => players.find(p => p.user_id === user?.id), [players, user])
  const humanPlayers = useMemo(() => players.filter(p => !p.is_bot), [players])
  const readyCount = useMemo(() => humanPlayers.filter(p => p.is_ready).length, [humanPlayers])
  const allReady = humanPlayers.length > 0 && readyCount === humanPlayers.length && players.length >= 3

  // QR code generation
  useEffect(() => {
    if (!room) return
    QRCode.toDataURL(`${window.location.origin}/room/${room.code}`, {
      width: 120, margin: 1,
      color: { dark: '#0a0a0a', light: '#e8e8e8' },
    }).then(setQrDataUrl).catch(() => {})
  }, [room?.code])

  // Start lobby ambient on first user interaction
  useEffect(() => {
    const start = () => { audioManager.playAmbient('lobby'); document.removeEventListener('click', start); document.removeEventListener('touchstart', start) }
    document.addEventListener('click', start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => { audioManager.stopAmbient(); document.removeEventListener('click', start); document.removeEventListener('touchstart', start) }
  }, [])

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

  const BOT_NAMES = [
    'ROTTEN RON', 'BRAIN EATER', 'DEAD ED', 'GROANING GARY',
    'LIMPING LEE', 'PALE PETE', 'MOANING MAX', 'CREEPY CORA',
    'CORPSE CARL', 'SHAMBLING SHELLY',
  ]

  async function handleAddBot() {
    if (!room || !user) return
    if (players.length >= room.settings.max_players) {
      showToast('Room is full — remove a player first', 'error')
      return
    }
    const existingBots = players.filter(p => p.is_bot)
    const name = BOT_NAMES[existingBots.length % BOT_NAMES.length]
    const botUserId = crypto.randomUUID()
    const { error } = await supabase.from('players').insert({
      room_id: room.id,
      user_id: botUserId,
      username: name,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${botUserId}&backgroundColor=1a0a0a`,
      is_host: false,
      is_ready: true,
      is_bot: true,
      status: 'alive',
      lives: 1,
      hand: [],
    })
    if (error) showToast('Failed to add bot', 'error')
  }

  async function handleRemoveBot(bot: Player) {
    await supabase.from('players').delete().eq('id', bot.id)
  }

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
    navigator.clipboard.writeText(room.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  function copyLink() {
    if (!room) return
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1500)
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
    <div style={{
      position: 'relative', minHeight: '100vh',
      background: `
        radial-gradient(ellipse 80% 50% at 50% 0%, rgba(80,0,0,0.2) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 90% 100%, rgba(0,40,0,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 40% 30% at 10% 50%, rgba(0,0,40,0.1) 0%, transparent 60%),
        #0a0a0a
      `,
    }}>
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

      <DevPanel roomId={room.id} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '24px' }} className="waiting-room-layout">
        {/* Room header */}
        <div
          className="waiting-room-header"
          style={{
            position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px',
          }}
        >
          <div>
            <img src="/assets/zombie_hunt_logo.svg" alt="ZOMBIE HUNT" style={{ width: '90px', height: 'auto', display: 'block', marginBottom: '4px' }} />
            <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '32px', color: 'var(--color-text)', letterSpacing: '0.05em', lineHeight: 1, margin: 0 }}>
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
                  color: codeCopied ? 'var(--color-green)' : 'var(--color-text-muted)',
                  transition: 'color 150ms', fontSize: '10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {codeCopied ? '✓' : <Copy size={13} />}
              </button>
            </div>
          </div>
          {/* Center title */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '30px', color: 'var(--color-text-muted)', letterSpacing: '0.25em' }}>LOBBY SCREEN</span>
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

        {/* Two-column layout: left sidebar + player grid */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{
            width: '272px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: '0',
            background: '#13131a', border: '1px solid var(--color-border)',
          }}>

            {/* Accordion 1 — COMMS */}
            <div>
              <button
                onClick={() => setCommsOpen(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', background: '#1a1a24',
                  border: 'none', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', color: 'var(--color-text)',
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>☰</span>
                <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.08em', flex: 1, textAlign: 'left' }}>COMMS</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', transition: 'transform 200ms', display: 'inline-block', transform: commsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              <AnimatePresence initial={false}>
                {commsOpen && (
                  <motion.div
                    key="comms"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 320, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', borderBottom: '1px solid var(--color-border)' }}
                  >
                    <div style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
                      <LobbyChat roomId={room.id} initialMessages={initialChat} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 2 — ROOM INFO */}
            <div>
              <button
                onClick={() => setInfoOpen(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', background: '#1a1a24',
                  border: 'none', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', color: 'var(--color-text)',
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>☰</span>
                <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.08em', flex: 1, textAlign: 'left' }}>ROOM INFO</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', transition: 'transform 200ms', display: 'inline-block', transform: infoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              <AnimatePresence initial={false}>
                {infoOpen && (() => {
                  const dist = cardDistribution(players.length)
                  const timerMins = Math.round((room.settings.round_timer_seconds ?? 60) / 60)
                  const totalRounds = (room.settings as unknown as { total_rounds?: number }).total_rounds ?? 10
                  return (
                    <motion.div
                      key="info"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {([
                          ['Max Players', String(room.settings.max_players)],
                          ['Action Timer', `${timerMins} min`],
                          ['Total Rounds', String(totalRounds)],
                          ['Cards', `${dist.zombieCount}🧟 · ${dist.vaccineCount}💉 · ${dist.shotgunCount}🔫`],
                        ] as [string,string][]).map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed var(--color-border)' }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>{label}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text)' }}>{value}</span>
                          </div>
                        ))}
                        {/* Invite link */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px dashed var(--color-border)' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {window.location.origin}/room/{room.code}
                          </span>
                          <button
                            onClick={copyLink}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: linkCopied ? 'var(--color-green)' : 'var(--color-text-muted)', flexShrink: 0 }}
                          >
                            {linkCopied ? '✓' : <Copy size={12} />}
                          </button>
                        </div>
                        {/* QR Code */}
                        {qrDataUrl && (
                          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                            <img src={qrDataUrl} alt="QR" style={{ width: '100px', height: '100px', imageRendering: 'pixelated' }} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            </div>

            {/* ── Bottom: title + player count + action button ── */}
            <div style={{ padding: '16px 14px', marginTop: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '22px', color: 'var(--color-red)', letterSpacing: '0.05em' }}>ZOMBIE HUNT</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {players.length} / {room.settings.max_players} PLAYERS
                </div>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.3, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: 'var(--color-red)', lineHeight: 1, display: 'block' }}
                  >
                    {countdown}
                  </motion.span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>GAME STARTING</span>
                </div>
              )}

              {/* Host actions */}
              {isHost && countdown === null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={handleForceStart}
                    disabled={players.length < 3}
                    style={{
                      width: '100%', padding: '12px',
                      fontFamily: "'Bebas Neue', cursive", fontSize: '18px', letterSpacing: '0.08em',
                      background: players.length < 3 ? 'rgba(0,160,0,0.15)' : 'rgba(0,200,0,0.85)',
                      border: '1px solid #00c800',
                      color: players.length < 3 ? '#005500' : '#001800',
                      cursor: players.length < 3 ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    START GAME
                  </button>
                  {players.length < room.settings.max_players && (
                    <button
                      onClick={handleAddBot}
                      style={{
                        width: '100%', padding: '8px',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.06em',
                        background: 'rgba(255,107,0,0.08)',
                        border: '1px solid rgba(255,107,0,0.4)',
                        color: 'var(--color-warning)',
                        cursor: 'pointer', transition: 'all 150ms',
                      }}
                    >
                      🤖 ADD BOT
                    </button>
                  )}
                </div>
              )}
              {isHost && countdown !== null && (
                <button
                  onClick={handleCancelCountdown}
                  style={{
                    width: '100%', padding: '10px',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                    background: 'transparent', border: '1px solid var(--color-red)',
                    color: 'var(--color-red)', cursor: 'pointer',
                  }}
                >
                  CANCEL
                </button>
              )}
              {/* Non-host ready toggle */}
              {!isHost && myPlayer && (
                <button
                  onClick={handleReadyToggle}
                  style={{
                    width: '100%', padding: '12px',
                    fontFamily: "'Bebas Neue', cursive", fontSize: '18px', letterSpacing: '0.08em',
                    background: myPlayer.is_ready ? 'rgba(0,200,0,0.15)' : 'transparent',
                    border: `1px solid ${myPlayer.is_ready ? '#00c800' : 'var(--color-border)'}`,
                    color: myPlayer.is_ready ? '#00c800' : 'var(--color-text-muted)',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {myPlayer.is_ready ? '✓ READY' : 'MARK READY'}
                </button>
              )}
            </div>
          </div>

          {/* ── PLAYER CARD GRID ── */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
              padding: '4px 2px',
            }}>
              {/* Filled player slots */}
              {players.map(player => {
                const isSelf = player.user_id === user?.id
                const isBot = player.is_bot === true
                const isBeingKicked = kickConfirmId === player.id
                return (
                  <div key={player.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                    <div style={{
                      width: '140px', padding: '14px 10px',
                      background: isBot ? '#0d0d0a' : isSelf ? '#220e0e' : '#1C1C22',
                      border: `1px solid ${isBot ? 'rgba(255,107,0,0.3)' : isSelf ? '#4a1a1a' : '#3a3a44'}`,
                      borderTop: player.is_host ? '2px solid #ff6b00' : isBot ? '2px solid rgba(255,107,0,0.5)' : undefined,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      position: 'relative',
                    }}>
                      {player.is_host && (
                        <span style={{ position: 'absolute', top: '-8px', right: '-6px', fontSize: '14px' }}>👑</span>
                      )}
                      {isBot && (
                        <span style={{ position: 'absolute', top: '-8px', left: '-6px', fontSize: '12px' }}>🤖</span>
                      )}
                      <img
                        src={player.avatar_url}
                        alt={player.username}
                        style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#0a0a0a', border: `2px solid ${isBot ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.1)'}` }}
                      />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                        color: isBot ? 'var(--color-warning)' : '#f0f0f0', marginTop: '8px', textAlign: 'center',
                        maxWidth: '118px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {player.username}
                      </span>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', marginTop: '6px',
                        padding: '3px 8px',
                        border: `1px solid ${isSelf ? 'var(--color-red)' : isBot ? 'rgba(255,107,0,0.5)' : player.is_ready ? 'var(--color-green)' : 'var(--color-border)'}`,
                        color: isSelf ? 'var(--color-red)' : isBot ? 'var(--color-warning)' : player.is_ready ? 'var(--color-green)' : 'var(--color-text-muted)',
                        background: isBot ? 'rgba(255,107,0,0.06)' : player.is_ready && !isSelf ? 'rgba(0,255,65,0.06)' : 'transparent',
                        letterSpacing: '0.05em',
                      }}>
                        {isSelf ? 'YOU' : isBot ? 'AUTO-PLAY' : player.is_ready ? 'READY' : 'WAITING'}
                      </span>
                    </div>
                    {/* Host controls */}
                    {isHost && !isSelf && (
                      <AnimatePresence mode="wait">
                        {isBot ? (
                          <motion.button
                            key="remove-bot"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => handleRemoveBot(player)}
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                              color: 'var(--color-warning)', border: '1px solid rgba(255,107,0,0.4)',
                              background: 'rgba(255,107,0,0.06)', padding: '2px 10px',
                              cursor: 'pointer', width: '140px', letterSpacing: '0.05em',
                            }}
                          >
                            ✕ REMOVE BOT
                          </motion.button>
                        ) : !isBeingKicked ? (
                          <motion.button
                            key="kick"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setKickConfirmId(player.id)}
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                              color: 'var(--color-red)', border: '1px solid var(--color-red)',
                              background: 'rgba(255,0,0,0.06)', padding: '2px 10px',
                              cursor: 'pointer', width: '140px', letterSpacing: '0.05em',
                            }}
                          >
                            ✕ KICK
                          </motion.button>
                        ) : (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '140px' }}
                          >
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--color-text-muted)' }}>KICK {player.username.slice(0, 8).toUpperCase()}?</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { handleKick(player); setKickConfirmId(null) }} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-red)', border: '1px solid var(--color-red)', background: 'rgba(255,0,0,0.1)', padding: '2px 10px', cursor: 'pointer' }}>YES</button>
                              <button onClick={() => setKickConfirmId(null)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', background: 'transparent', padding: '2px 10px', cursor: 'pointer' }}>NO</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                )
              })}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, room.settings.max_players - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} style={{
                  width: '140px', height: '148px',
                  border: '1.5px dashed rgba(58,58,58,0.35)',
                  background: 'rgba(20,20,22,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'var(--color-text-muted)', opacity: 0.3, fontSize: '22px' }}>+</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
