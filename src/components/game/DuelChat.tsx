import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'

interface DuelChatMessage {
  id: string
  sender_id: string
  username: string
  message: string
  created_at: string
}

interface DuelChatProps {
  isOpen: boolean
  onToggle: () => void
  opponent: { id: string; user_id: string; username: string; is_bot?: boolean } | null
  isNegotiating: boolean
  myPair: string[] | null
}

export default function DuelChat({ isOpen, onToggle, opponent, isNegotiating, myPair }: DuelChatProps) {
  const { gameState, myPlayer, room } = useGame()
  const { user } = useGameStore()
  const [messages, setMessages] = useState<DuelChatMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const myUserId = myPlayer.user_id
  const opponentUserId = opponent?.user_id ?? null

  const playerAId = myUserId < (opponentUserId ?? '') ? myUserId : opponentUserId
  const playerBId = myUserId > (opponentUserId ?? '') ? myUserId : opponentUserId

  // Load messages
  useEffect(() => {
    if (!myPair || !opponent) return
    supabase.from('duel_chat')
      .select('*')
      .eq('room_id', room.id)
      .eq('round_number', gameState.round_number)
      .in('player_a_id', [playerAId, playerBId])
      .in('player_b_id', [playerAId, playerBId])
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as DuelChatMessage[]) })
  }, [room.id, gameState.round_number, myPair, opponent])

  // Realtime subscription
  useEffect(() => {
    if (!myPair || !opponent) return
    const ch = supabase.channel(`duel-chat-${room.id}-${gameState.round_number}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_chat', filter: `room_id=eq.${room.id}` }, payload => {
        setMessages(prev => [...prev, payload.new as DuelChatMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [room.id, gameState.round_number, myPair, opponent])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !opponent || !user) return
    const msg = input.slice(0, 160)
    setInput('')
    await supabase.from('duel_chat').insert({
      room_id: room.id,
      round_number: gameState.round_number,
      player_a_id: playerAId,
      player_b_id: playerBId,
      sender_id: user.id,
      username: myPlayer.username,
      message: msg,
    })
  }

  const phaseColor = isNegotiating ? 'var(--color-green)' : 'var(--color-red)'

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="open"
          initial={{ x: -260 }}
          animate={{ x: 0 }}
          exit={{ x: -260 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '260px', zIndex: 5,
            background: 'rgba(10,10,10,0.92)', borderRight: '1px solid var(--color-border)',
            backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: 'var(--color-text)' }}>DUEL COMMS</span>
              <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
              vs {opponent?.username ?? '—'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: phaseColor, marginTop: '2px' }}>
              {isNegotiating ? 'NEGOTIATION' : 'ACTION'}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: m.sender_id === user?.id ? 'var(--color-red)' : 'var(--color-text-muted)' }}>
                  {m.username}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                  {m.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '6px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              maxLength={160}
              placeholder="Make your move..."
              style={{
                flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', padding: '6px 8px', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px', outline: 'none',
              }}
            />
            <button onClick={sendMessage} style={{
              background: 'var(--color-red)', border: 'none', color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '0 10px', cursor: 'pointer',
            }}>→</button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="closed"
          initial={{ x: -32 }}
          animate={{ x: 0 }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '32px', zIndex: 5,
            background: 'rgba(10,10,10,0.92)', borderRight: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
          onClick={onToggle}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px' }}>💬</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--color-text-muted)', writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>COMMS</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
