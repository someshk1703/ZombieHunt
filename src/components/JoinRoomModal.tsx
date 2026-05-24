import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useToast } from './Toast'

interface JoinRoomModalProps {
  initialCode?: string
  canClose?: boolean
  onClose?: () => void
}

export default function JoinRoomModal({ initialCode = '', canClose = true, onClose }: JoinRoomModalProps) {
  const navigate = useNavigate()
  const { user, username, avatarUrl, setCurrentRoom } = useGameStore()
  const { showToast } = useToast()

  const [slots, setSlots] = useState<string[]>(() => {
    const arr = initialCode.toUpperCase().split('').slice(0, 6)
    while (arr.length < 6) arr.push('')
    return arr
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = slots.join('')

  const setSlot = useCallback((index: number, char: string) => {
    setSlots(prev => {
      const next = [...prev]
      next[index] = char.toUpperCase()
      return next
    })
  }, [])

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (slots[index]) {
        setSlot(index, '')
      } else if (index > 0) {
        setSlot(index - 1, '')
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter' && code.length === 6) {
      handleJoin()
    }
  }

  function handleInput(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!raw) return

    if (raw.length > 1) {
      // Paste into single box — distribute across slots
      const chars = raw.split('').slice(0, 6 - index)
      setSlots(prev => {
        const next = [...prev]
        chars.forEach((c, i) => { if (index + i < 6) next[index + i] = c })
        return next
      })
      const nextFocus = Math.min(index + chars.length, 5)
      inputRefs.current[nextFocus]?.focus()
      return
    }

    setSlot(index, raw[0])
    if (index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    const next = pasted.split('')
    while (next.length < 6) next.push('')
    setSlots(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleJoin() {
    if (code.length !== 6) return
    setError('')
    setLoading(true)

    try {
      // Query room
      const { data: rooms, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .limit(1)

      if (roomErr) throw roomErr
      if (!rooms || rooms.length === 0) {
        setError('NO ROOM WITH THIS CODE EXISTS')
        setLoading(false)
        return
      }

      const room = rooms[0]

      if (room.status !== 'lobby') {
        setError('THIS GAME IS ALREADY IN PROGRESS')
        setLoading(false)
        return
      }

      // Check player count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)

      const maxPlayers = room.settings?.max_players ?? 10
      if ((count ?? 0) >= maxPlayers) {
        setError(`THIS ROOM IS FULL (${count}/${maxPlayers} PLAYERS)`)
        setLoading(false)
        return
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user!.id)
        .limit(1)

      if (!existing || existing.length === 0) {
        // Insert player
        const { error: insertErr } = await supabase.from('players').insert({
          room_id: room.id,
          user_id: user!.id,
          username,
          avatar_url: avatarUrl,
          is_host: false,
          is_ready: false,
        })
        if (insertErr) throw insertErr
      }

      setCurrentRoom({ id: room.id, code: room.code, status: room.status })
      navigate(`/room/${room.code}`)
    } catch (err) {
      showToast('Failed to join room. Please try again.', 'error')
      console.error('[join]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="join-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={() => canClose && onClose?.()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--color-text)', letterSpacing: '0.05em' }}>
              JOIN A ROOM
            </h2>
            {canClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                × CLOSE
              </button>
            )}
          </div>

          {/* Code Label */}
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Room Code
          </p>

          {/* 6-box code input */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }} onPaste={handlePaste}>
            {slots.map((char, i) => (
              <div key={i} style={{ flex: 1 }}>
                <input
                  ref={el => { inputRefs.current[i] = el }}
                  value={char}
                  onChange={e => handleInput(i, e)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  maxLength={6}
                  disabled={loading}
                  inputMode="text"
                  autoCapitalize="characters"
                  style={{
                    width: '100%',
                    height: '56px',
                    textAlign: 'center',
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: '28px',
                    color: 'var(--color-text)',
                    background: 'var(--color-bg)',
                    border: `1px solid ${char ? 'var(--color-border)' : 'var(--color-border)'}`,
                    borderRadius: '2px',
                    outline: 'none',
                    caretColor: 'transparent',
                    letterSpacing: '0.1em',
                    transition: 'border-color 150ms, box-shadow 150ms',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--color-red)'
                    e.currentTarget.style.boxShadow = '0 0 8px var(--color-red-glow)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: '11px', color: 'var(--color-red)', marginBottom: '12px', letterSpacing: '0.05em' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Join Button */}
          <button
            className="btn-primary"
            style={{ width: '100%', marginBottom: '20px' }}
            disabled={code.length !== 6 || loading}
            onClick={handleJoin}
          >
            {loading ? 'CHECKING CODE...' : 'JOIN ROOM'}
          </button>

          {/* Divider */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              — OR —
            </span>
          </div>

          {/* Quick Play link */}
          <button
            onClick={() => { onClose?.(); navigate('/quickplay') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px', letterSpacing: '0.05em', width: '100%', textAlign: 'center',
              padding: '4px', transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-red)'; e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.textDecoration = 'none' }}
          >
            Join the matchmaking queue instead →
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
