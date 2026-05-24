import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'

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

interface LobbyChatProps {
  roomId: string
  initialMessages: ChatMessage[]
}

const REACTIONS = ['👀', '💀', '🧟', '💉', '🔫', '⚠️']

export default function LobbyChat({ roomId, initialMessages }: LobbyChatProps) {
  const { user, username, avatarUrl } = useGameStore()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${roomId}` },
        payload => {
          setMessages(prev => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  // Auto-scroll to bottom on new messages unless user scrolled up
  useEffect(() => {
    if (!isScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isScrolledUp])

  function handleScroll() {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 80)
  }

  async function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || !user) return
    setInput('')
    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: user.id,
      username,
      avatar_url: avatarUrl,
      message: trimmed,
      reaction: null,
      type: 'message',
    })
  }

  async function sendReaction(emoji: string) {
    if (!user) return
    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: user.id,
      username,
      avatar_url: avatarUrl,
      message: null,
      reaction: emoji,
      type: 'reaction',
    })
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const panelStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '400px',
    overflow: 'hidden',
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-text)', letterSpacing: '0.05em' }}>
          COMMS
        </span>
      </div>

      {/* Reaction bar */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            style={{
              width: '32px', height: '32px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg)', fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-red)'; e.currentTarget.style.transform = 'scale(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '12px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) var(--color-bg)',
          position: 'relative',
        }}
      >
        {messages.map(msg => {
          const isSelf = msg.user_id === user?.id
          const isSystem = msg.type === 'system'

          if (isSystem) {
            return (
              <div key={msg.id} style={{ marginBottom: '8px', textAlign: 'center' }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                  color: 'var(--color-text-muted)', fontStyle: 'italic',
                  borderLeft: '2px solid var(--color-warning)', paddingLeft: '8px',
                }}>
                  {msg.message}
                </span>
              </div>
            )
          }

          if (msg.type === 'reaction') {
            return (
              <div key={msg.id} style={{ marginBottom: '8px', textAlign: 'center' }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                  color: 'var(--color-text-muted)', fontStyle: 'italic',
                }}>
                  {msg.username} reacted {msg.reaction}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              style={{
                marginBottom: '8px',
                display: 'flex',
                flexDirection: isSelf ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '6px',
              }}
            >
              <img
                src={msg.avatar_url}
                alt={msg.username}
                style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                {!isSelf && (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                    {msg.username}
                  </span>
                )}
                <div
                  title={formatTime(msg.created_at)}
                  style={{
                    background: isSelf ? 'rgba(204,0,0,0.08)' : 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    padding: '6px 10px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: 'var(--color-text)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {isScrolledUp && (
        <button
          onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setIsScrolledUp(false) }}
          style={{
            position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            background: 'var(--color-surface)', border: '1px solid var(--color-red)',
            color: 'var(--color-red)', padding: '4px 12px', cursor: 'pointer',
            zIndex: 5,
          }}
        >
          ▼ NEW MESSAGE
        </button>
      )}

      {/* Chat input */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          className="input-base"
          style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
          placeholder="Say something..."
          maxLength={200}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="btn-primary"
          style={{ width: '40px', height: '40px', fontSize: '18px', padding: 0, flexShrink: 0 }}
          onClick={sendMessage}
          disabled={!input.trim()}
        >
          →
        </button>
      </div>
    </div>
  )
}
