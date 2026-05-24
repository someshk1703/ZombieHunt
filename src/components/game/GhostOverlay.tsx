import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import { Card } from '../../store/gameStore'
import CardFace from './CardFace'

interface GhostData {
  allHands: Record<string, Card[]>
  infectionMap: Record<string, { infectorId: string | null; infectorUsername: string | null }>
  zombieCardHolders: string[]
  committedCards: Record<string, number>
  players: { id: string; user_id: string; username: string; avatar_url: string; status: string }[]
}

export default function GhostOverlay() {
  const { myPlayer, players, room } = useGame()
  const { user } = useGameStore()
  const [ghostData, setGhostData] = useState<GhostData | null>(null)
  const [chatMessages, setChatMessages] = useState<{ id: string; username: string; message: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const elimination_round = (myPlayer as unknown as { elimination_round?: number }).elimination_round
  const otherGhosts = players.filter(p => p.status === 'eliminated' && p.id !== myPlayer.id)

  // Fetch ghost data
  useEffect(() => {
    async function fetchGhostData() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghost-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ room_id: room.id })
      })
      if (res.ok) setGhostData(await res.json())
    }
    fetchGhostData()
    const interval = setInterval(fetchGhostData, 5000)
    return () => clearInterval(interval)
  }, [room.id])

  // Ghost chat subscription
  useEffect(() => {
    supabase.from('room_chat').select('*').eq('room_id', room.id).eq('type', 'ghost').order('created_at').then(({ data }) => {
      if (data) setChatMessages(data.map(m => ({ id: m.id, username: m.username, message: m.message })))
    })
    const ch = supabase.channel(`ghost-chat-${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${room.id}` }, payload => {
        if ((payload.new as { type: string }).type === 'ghost') {
          const m = payload.new as { id: string; username: string; message: string }
          setChatMessages(prev => [...prev, { id: m.id, username: m.username, message: m.message }])
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [room.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  async function sendGhostMessage() {
    if (!chatInput.trim() || !user) return
    const msg = chatInput.slice(0, 200)
    setChatInput('')
    await supabase.from('room_chat').insert({ room_id: room.id, user_id: user.id, username: myPlayer.username, message: msg, type: 'ghost' })
  }

  const alivePlayers = ghostData?.players.filter(p => p.status === 'alive' || p.status === 'infected') ?? []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR */}
      <div style={{
        height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'rgba(0,0,0,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: 'var(--color-text-muted)' }}>👻 GHOST MODE</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
          YOU WERE ELIMINATED — ROUND {elimination_round ?? '?'}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
          {otherGhosts.length} GHOSTS WATCHING
        </span>
      </div>

      {/* MIDDLE ROW */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANEL — ALL HANDS */}
        <div style={{
          width: '220px', background: 'rgba(10,10,10,0.92)', borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '12px', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>ALL HANDS</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>GHOST INTEL ONLY</div>
          {alivePlayers.map(p => {
            const hand = ghostData?.allHands[p.id] ?? []
            const isInfected = p.status === 'infected'
            return (
              <div key={p.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <img src={p.avatar_url} alt={p.username} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: isInfected ? 'var(--color-green)' : 'var(--color-text)' }}>
                    {p.username}
                    {isInfected && <span style={{ marginLeft: '4px', fontSize: '9px' }}>🧟</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                  {(hand as Card[]).map(card => <CardFace key={card.id} card={card} size="sm" style={{ transform: 'scale(0.6)', transformOrigin: 'top left', margin: '-12px -10px 0 0' }} />)}
                </div>
              </div>
            )
          })}
        </div>

        {/* RIGHT PANEL — INFECTION MAP */}
        <div style={{
          width: '200px', background: 'rgba(10,10,10,0.92)', borderLeft: '1px solid rgba(255,255,255,0.08)',
          padding: '12px', overflowY: 'auto', flexShrink: 0, marginLeft: 'auto',
        }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>INFECTION MAP</div>
          {Object.keys(ghostData?.infectionMap ?? {}).length === 0 ? (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No active infections</div>
          ) : (
            Object.entries(ghostData?.infectionMap ?? {}).map(([infectedId, info]) => {
              const infectedP = ghostData?.players.find(p => p.id === infectedId)
              const infectorP = info.infectorId ? ghostData?.players.find(p => p.id === info.infectorId) : null
              return (
                <div key={infectedId} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                  {infectorP && (
                    <>
                      <img src={infectorP.avatar_url} alt={infectorP.username} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--color-green)' }} />
                      <span style={{ color: 'var(--color-green)', fontSize: '10px' }}>→</span>
                    </>
                  )}
                  {infectedP && (
                    <img src={infectedP.avatar_url} alt={infectedP.username} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--color-green)' }} />
                  )}
                </div>
              )
            })
          )}
          <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>ZOMBIE CARD HOLDERS</div>
            {(ghostData?.zombieCardHolders ?? []).map(id => {
              const p = ghostData?.players.find(x => x.id === id)
              return p ? (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <img src={p.avatar_url} alt={p.username} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-green)' }}>{p.username}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR — GHOST CHAT */}
      <div style={{
        height: '120px', background: 'rgba(10,10,10,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0,
        pointerEvents: 'auto',
      }}>
        <div>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '12px', color: 'var(--color-text-muted)' }}>GHOST COMMS</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>Only ghosts can see this chat</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {chatMessages.map(m => (
            <div key={m.id} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              👻 {m.username}: {m.message}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendGhostMessage()}
            placeholder="Speak with the dead..."
            style={{
              flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', padding: '4px 8px', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px', outline: 'none',
            }}
          />
          <button onClick={sendGhostMessage} style={{ background: 'var(--color-text-muted)', border: 'none', color: '#000', padding: '0 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>→</button>
        </div>
      </div>
    </div>
  )
}
