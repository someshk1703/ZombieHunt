import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import PlayerStatusBadge from '../PlayerStatusBadge'

const DISCUSSION_DURATION_SECONDS = 120 // 2 minutes
const EMOJI_REACTIONS = ['😱', '🧟', '🔫', '💉', '👀', '🤝', '😈', '💀']

interface ChatMessage {
  id: string
  username: string
  avatar_url: string
  message: string | null
  reaction: string | null
  type: 'message' | 'reaction' | 'system'
  created_at: string
}

export default function DiscussionRoundScreen() {
  const { gameState, players, room, isHost } = useGame()
  const { user, username } = useGameStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(DISCUSSION_DURATION_SECONDS)
  const [starting, setStarting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartRef = useRef(false)

  const alivePlayers = players.filter(p => p.status === 'alive' || p.status === 'infected')
  const totalRounds = (room.settings as unknown as { total_rounds?: number }).total_rounds ?? 10

  function getPublicStatus(player: typeof players[number]): 'alive' | 'infected' | 'eliminated' {
    if (player.status === 'eliminated') return 'eliminated'
    const roundsInfected = (player as unknown as { infection_rounds?: number }).infection_rounds ?? 0
    const infectionRevealed = room.settings.infection_visibility && roundsInfected > 1
    return infectionRevealed ? 'infected' : 'alive'
  }

  // Load existing discussion chat
  useEffect(() => {
    supabase
      .from('room_chat')
      .select('*')
      .eq('room_id', room.id)
      .eq('type', 'message')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[])
      })

    const ch = supabase
      .channel(`discussion-chat-${room.id}-${gameState.round_number}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${room.id}` },
        payload => {
          const m = payload.new as ChatMessage
          if (m.type === 'message' || m.type === 'reaction' || m.type === 'system') {
            setMessages(prev => [...prev, m])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [room.id, gameState.round_number])

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Countdown timer
  useEffect(() => {
    const discussionStartedAt = (gameState as unknown as { discussion_started_at?: string }).discussion_started_at
    if (discussionStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(discussionStartedAt).getTime()) / 1000)
      setTimeLeft(Math.max(0, DISCUSSION_DURATION_SECONDS - elapsed))
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (isHost && !autoStartRef.current) {
            autoStartRef.current = true
            startNextRound()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isHost])

  async function startNextRound() {
    if (starting) return
    setStarting(true)
    try {
      const negTimer = (room.settings as unknown as { round_timer_seconds?: number }).round_timer_seconds ?? 60
      const negotiationDeadline = new Date(Date.now() + negTimer * 1000).toISOString()
      const phaseDeadline = new Date(Date.now() + negTimer * 1000 + 25000).toISOString()

      await supabase
        .from('game_state')
        .update({
          phase: 'blind_action',
          negotiation_deadline: negotiationDeadline,
          phase_deadline: phaseDeadline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameState.id)
    } catch {
      setStarting(false)
    }
  }

  async function sendMessage() {
    const text = chatInput.trim().slice(0, 200)
    if (!text || !user) return
    setChatInput('')
    await supabase.from('room_chat').insert({
      room_id: room.id,
      user_id: user.id,
      username,
      avatar_url: '',
      message: text,
      reaction: null,
      type: 'message',
    })
  }

  async function sendReaction(emoji: string) {
    if (!user) return
    await supabase.from('room_chat').insert({
      room_id: room.id,
      user_id: user.id,
      username,
      avatar_url: '',
      message: null,
      reaction: emoji,
      type: 'reaction',
    })
  }

  const timerColor =
    timeLeft > 60 ? 'var(--color-text)' : timeLeft > 30 ? 'var(--color-warning)' : 'var(--color-red)'
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: '#141416',
          borderBottom: '1px solid #383838',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {/* Left — round progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            ROUNDS COMPLETE: {gameState.round_number} / {totalRounds}
          </span>
          <motion.span
            animate={timeLeft <= 30 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: '22px',
              color: timerColor,
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            {mins}:{secs}
          </motion.span>
        </div>

        {/* Center — title */}
        <span
          style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: '20px',
            color: 'var(--color-text)',
            letterSpacing: '0.1em',
          }}
        >
          DISCUSSION ROUND
        </span>

        {/* Right — Start Next Round (host only) */}
        {isHost ? (
          <button
            onClick={startNextRound}
            disabled={starting}
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: '14px',
              letterSpacing: '0.08em',
              padding: '8px 16px',
              background: starting ? 'rgba(204,0,0,0.1)' : 'var(--color-red)',
              color: starting ? 'var(--color-text-muted)' : '#000',
              border: '1px solid var(--color-red)',
              cursor: starting ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {starting ? 'STARTING...' : 'START NEXT ROUND →'}
          </button>
        ) : (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.1em',
            }}
          >
            WAITING FOR HOST
          </span>
        )}
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', justifyContent: 'center' }}>
        {/* LEFT — Global Chat */}
        <div
          style={{
            flex: '0 1 680px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #383838',
          }}
        >
          {/* Emoji reactions bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid #383838',
              background: 'rgba(255,255,255,0.02)',
              flexShrink: 0,
            }}
          >
            {EMOJI_REACTIONS.slice(0, 4).map(e => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                style={{
                  background: 'none',
                  border: '1px solid #383838',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={el => ((el.target as HTMLElement).style.borderColor = 'var(--color-red)')}
                onMouseLeave={el => ((el.target as HTMLElement).style.borderColor = '#383838')}
              >
                {e}
              </button>
            ))}
            <span
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.1em',
              }}
            >
              GLOBAL COMMS
            </span>
            {EMOJI_REACTIONS.slice(4).map(e => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                style={{
                  background: 'none',
                  border: '1px solid #383838',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={el => ((el.target as HTMLElement).style.borderColor = 'var(--color-red)')}
                onMouseLeave={el => ((el.target as HTMLElement).style.borderColor = '#383838')}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.15em',
                }}
              >
                DISCUSS YOUR SUSPICIONS...
              </div>
            )}
            {messages.map(m => (
              <div key={m.id}>
                {m.type === 'system' ? (
                  <div
                    style={{
                      textAlign: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--color-text-muted)',
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}
                  >
                    {m.message}
                  </div>
                ) : m.type === 'reaction' ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 0',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {m.username}
                    </span>
                    <span style={{ fontSize: '20px' }}>{m.reaction}</span>
                  </div>
                ) : (
                  <div>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        color:
                          m.username === username ? 'var(--color-red)' : 'var(--color-text-muted)',
                        letterSpacing: '0.05em',
                        marginRight: '8px',
                      }}
                    >
                      {m.username}:
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: 'var(--color-text)',
                      }}
                    >
                      {m.message}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              borderTop: '1px solid #383838',
              flexShrink: 0,
            }}
          >
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message..."
              maxLength={200}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #383838',
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                padding: '8px 12px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--color-red)',
                color: 'var(--color-red)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* RIGHT — Remaining Players */}
        <div
          style={{
            width: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            REMAINING PLAYERS: {alivePlayers.length}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            {alivePlayers.map(p => {
              const publicStatus = getPublicStatus(p)
              return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${publicStatus === 'infected' ? 'rgba(0,255,65,0.3)' : 'var(--color-border)'}`,
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '2px',
                }}
              >
                <img
                  src={p.avatar_url}
                  alt={p.username}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-surface-2)',
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.username}
                </span>
                <PlayerStatusBadge status={publicStatus} size="sm" />
              </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
