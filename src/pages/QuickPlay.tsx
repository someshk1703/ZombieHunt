import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useToast } from '../components/Toast'
import AtmosphericBackground from '../components/AtmosphericBackground'
import BackButton from '../components/BackButton'

interface PublicRoom {
  id: string
  code: string
  settings: { room_name?: string; max_players: number; visibility?: string }
  player_count: number
}

export default function QuickPlay() {
  const navigate = useNavigate()
  const { user, username, avatarUrl, setCurrentRoom } = useGameStore()
  const { showToast } = useToast()

  const [inQueue, setInQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch public rooms + realtime subscription
  useEffect(() => {
    async function fetchRooms() {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, code, settings')
        .eq('status', 'lobby')

      if (!rooms) return

      const roomsWithCount = await Promise.all(
        rooms
          .filter(r => r.settings?.visibility !== 'private')
          .map(async r => {
            const { count } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', r.id)
            return { ...r, player_count: count ?? 0 }
          })
      )
      setPublicRooms(roomsWithCount)
    }

    fetchRooms()

    const channel = supabase
      .channel('public-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Queue count subscription
  useEffect(() => {
    async function fetchQueueCount() {
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true })
      setQueueCount(count ?? 0)
    }

    fetchQueueCount()

    const channel = supabase
      .channel('queue-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchmaking_queue' }, fetchQueueCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Watch for being removed from queue (matched)
  useEffect(() => {
    if (!inQueue || !user) return

    const channel = supabase
      .channel(`queue-self-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'matchmaking_queue', filter: `user_id=eq.${user.id}` },
        async () => {
          // We were matched — find our room
          const { data: players } = await supabase
            .from('players')
            .select('room_id, rooms(id, code, status)')
            .eq('user_id', user.id)
            .limit(1)

          if (players && players.length > 0) {
            const p = players[0] as unknown as { room_id: string; rooms: { id: string; code: string; status: string } | null }
            if (p.rooms) {
              setCurrentRoom({ id: p.rooms.id, code: p.rooms.code, status: p.rooms.status as 'lobby' | 'playing' | 'finished' })
              navigate(`/room/${p.rooms.code}`)
            }
          }
          setInQueue(false)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [inQueue, user, navigate, setCurrentRoom])

  // Elapsed timer while in queue
  useEffect(() => {
    if (inQueue) {
      setElapsed(0)
      elapsedInterval.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (elapsedInterval.current) clearInterval(elapsedInterval.current)
    }
    return () => { if (elapsedInterval.current) clearInterval(elapsedInterval.current) }
  }, [inQueue])

  async function enterQueue() {
    try {
      await supabase.from('matchmaking_queue').insert({ user_id: user!.id, username, avatar_url: avatarUrl })
      setInQueue(true)
    } catch {
      showToast('Failed to join queue.', 'error')
    }
  }

  async function leaveQueue() {
    await supabase.from('matchmaking_queue').delete().eq('user_id', user!.id)
    setInQueue(false)
    setElapsed(0)
  }

  async function joinPublicRoom(room: PublicRoom) {
    try {
      const { data: existing } = await supabase.from('players').select('id').eq('room_id', room.id).eq('user_id', user!.id).limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from('players').insert({ room_id: room.id, user_id: user!.id, username, avatar_url: avatarUrl, is_host: false, is_ready: false })
      }
      setCurrentRoom({ id: room.id, code: room.code, status: 'lobby' })
      navigate(`/room/${room.code}`)
    } catch {
      showToast('Failed to join room.', 'error')
    }
  }

  const elapsedStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div style={{ position: 'relative', minHeight: '100vh', zIndex: 1, padding: '48px 16px 32px' }}>
      <AtmosphericBackground />
      <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <BackButton />
          <h1 className="font-display" style={{ fontSize: '42px', color: 'var(--color-red)', letterSpacing: '0.05em', marginTop: '12px' }}>QUICK PLAY</h1>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>Join the queue. Get matched. Survive.</p>
        </div>

        {/* Player identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <img src={avatarUrl ?? ''} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-bg)' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: 'var(--color-text)' }}>{username}</span>
          <span style={{ border: '1px solid var(--color-green)', color: 'var(--color-green)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', padding: '2px 6px', letterSpacing: '0.1em' }}>
            READY TO MATCH
          </span>
        </div>

        {/* Queue panel */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '32px', borderRadius: '2px', marginBottom: '0' }}>
          {/* Queue Status */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {inQueue ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-red)', display: 'inline-block', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)', letterSpacing: '0.1em' }}>SEARCHING FOR SURVIVORS...</span>
                </div>
                <p className="font-display" style={{ fontSize: '32px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{elapsedStr}</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  {queueCount} player{queueCount !== 1 ? 's' : ''} in queue
                </p>
                <button className="btn-secondary" onClick={leaveQueue}>LEAVE QUEUE</button>
              </>
            ) : (
              <>
                <p className="font-display" style={{ fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.1em', marginBottom: '6px' }}>QUEUE</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {queueCount} player{queueCount !== 1 ? 's' : ''} waiting
                </p>
              </>
            )}
          </div>

          {/* Public room list */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
              — or join an open room —
            </p>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {publicRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>NO OPEN ROOMS RIGHT NOW</p>
                  <button onClick={() => navigate('/lobby/create')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>
                    Create one?
                  </button>
                </div>
              ) : (
                publicRooms.map(room => (
                  <div
                    key={room.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text)' }}>
                      {room.settings?.room_name ?? room.code}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {room.player_count}/{room.settings?.max_players ?? 10}
                      </span>
                      <button
                        onClick={() => joinPublicRoom(room)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-red)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.1em' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        JOIN →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enter Queue button */}
          {!inQueue && (
            <button
              className="btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '18px', fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em' }}
              onClick={enterQueue}
            >
              ENTER THE QUEUE
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
