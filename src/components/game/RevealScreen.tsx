import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../store/gameStore'
import CardFace from './CardFace'

interface CommittedPair {
  playerA: { id: string; username: string; avatar_url: string; user_id: string; is_bot?: boolean }
  playerB: { id: string; username: string; avatar_url: string; user_id: string; is_bot?: boolean }
  cardsA: Card[]
  cardsB: Card[]
  totalA: number
  totalB: number
  winnerId: string | null
  event: string
}

type RevealStage = 'spotlight' | 'cards' | 'result' | 'next'

export default function RevealScreen() {
  const { gameState, players, room, isHost } = useGame()
  const [pairs, setPairs] = useState<CommittedPair[]>([])
  const [pairIndex, setPairIndex] = useState(0)
  const [stage, setStage] = useState<RevealStage>('spotlight')
  const [revealedCardCount, setRevealedCardCount] = useState(0)
  const [splashType, setSplashType] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  // Fetch committed cards on mount
  useEffect(() => {
    async function fetchCommitted() {
      const cc: Record<string, Card[]> = (gameState.committed_cards as Record<string, Card[]>) ?? {}
      const gamePairs: string[][] = gameState.pairs ?? []

      const resolved: CommittedPair[] = []
      for (const [aId, bId] of gamePairs) {
        const pA = players.find(p => p.id === aId)
        const pB = players.find(p => p.id === bId)
        if (!pA || !pB) continue

        const cardsA: Card[] = cc[pA.user_id] ?? []
        const cardsB: Card[] = cc[pB.user_id] ?? []
        const totalA = cardsA.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
        const totalB = cardsB.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)

        let winnerId: string | null = null
        let event = 'numeric'
        const sA = cardsA.find(c => c.type !== 'number')
        const sB = cardsB.find(c => c.type !== 'number')
        if (sA?.type === 'zombie' || sB?.type === 'zombie') event = 'zombie'
        if (sA?.type === 'shotgun' || sB?.type === 'shotgun') event = 'shotgun'
        if (totalA > totalB) winnerId = pA.id
        if (totalB > totalA) winnerId = pB.id

        resolved.push({ playerA: pA, playerB: pB, cardsA, cardsB, totalA, totalB, winnerId, event })
      }
      setPairs(resolved)
    }
    fetchCommitted()
  }, [gameState, players])

  const currentPair = pairs[pairIndex]

  // Advance through stages automatically
  useEffect(() => {
    if (!currentPair || done) return
    let timer: ReturnType<typeof setTimeout>

    if (stage === 'spotlight') {
      timer = setTimeout(() => setStage('cards'), 500)
    } else if (stage === 'cards') {
      const totalCards = currentPair.cardsA.length + currentPair.cardsB.length
      if (revealedCardCount < totalCards) {
        const specialCard = [...currentPair.cardsA, ...currentPair.cardsB][revealedCardCount]
        if (specialCard?.type !== 'number') setSplashType(specialCard?.type ?? null)
        timer = setTimeout(() => {
          setSplashType(null)
          setRevealedCardCount(c => c + 1)
        }, 800)
      } else {
        timer = setTimeout(() => setStage('result'), 400)
      }
    } else if (stage === 'result') {
      timer = setTimeout(() => setStage('next'), 4000)
    } else if (stage === 'next') {
      if (pairIndex < pairs.length - 1) {
        setPairIndex(i => i + 1)
        setStage('spotlight')
        setRevealedCardCount(0)
        setSplashType(null)
      } else {
        setDone(true)
        handleAllRevealed()
      }
    }

    return () => clearTimeout(timer)
  }, [stage, revealedCardCount, pairIndex, pairs, currentPair, done])

  const handleAllRevealed = useCallback(async () => {
    if (!isHost || processing) return
    setProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ room_id: room.id, round_number: gameState.round_number })
      })
    } catch { /* handled by game state revert */ }
  }, [isHost, room.id, gameState.round_number, processing])

  function handleSkip() {
    if (stage === 'next') return
    if (stage === 'spotlight') { setStage('cards'); return }
    if (stage === 'cards') { setRevealedCardCount(currentPair.cardsA.length + currentPair.cardsB.length); return }
    if (stage === 'result') { setStage('next'); return }
  }

  if (!currentPair) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>LOADING RESULTS...</span>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', flexDirection: 'column', gap: '16px' }}>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}
        >
          PROCESSING RESULTS...
        </motion.span>
      </div>
    )
  }

  const splashColors = { zombie: 'rgba(128,0,255,0.4)', shotgun: 'rgba(204,0,0,0.5)', vaccine: 'rgba(0,255,65,0.4)' }
  const splashLabels = { zombie: '🧟 ZOMBIE CARD!', shotgun: '🔫 SHOTGUN!', vaccine: '💉 VACCINE!' }
  const splashTextColors = { zombie: '#8000ff', shotgun: 'var(--color-red)', vaccine: 'var(--color-green)' }

  const allCards = [...currentPair.cardsA.map(c => ({ ...c, owner: 'A' })), ...currentPair.cardsB.map(c => ({ ...c, owner: 'B' }))]

  return (
    <div
      onClick={handleSkip}
      style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.9)', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
    >
      {/* Color splash */}
      <AnimatePresence>
        {splashType && splashColors[splashType as keyof typeof splashColors] && (
          <motion.div
            key={splashType}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1,
              background: `radial-gradient(circle, ${splashColors[splashType as keyof typeof splashColors]}, transparent)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Special card label */}
      <AnimatePresence>
        {splashType && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: '20%', left: 0, right: 0, textAlign: 'center',
              fontFamily: "'Bebas Neue', cursive", fontSize: '36px',
              color: splashTextColors[splashType as keyof typeof splashTextColors],
              zIndex: 20, pointerEvents: 'none',
            }}
          >
            {splashLabels[splashType as keyof typeof splashLabels]}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '24px', position: 'relative', zIndex: 10 }}>
        {/* SPOTLIGHT: VS display */}
        <motion.div
          key={`spot-${pairIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '8px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <img src={currentPair.playerA.avatar_url} alt={currentPair.playerA.username} style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: 'var(--color-text)' }}>{currentPair.playerA.username}</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: 'var(--color-red)' }}>VS</div>
          <div style={{ textAlign: 'center' }}>
            <img src={currentPair.playerB.avatar_url} alt={currentPair.playerB.username} style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: 'var(--color-text)' }}>{currentPair.playerB.username}</div>
          </div>
        </motion.div>

        {/* Cards revealed so far */}
        {stage !== 'spotlight' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            {allCards.slice(0, revealedCardCount).map((card, i) => (
              <motion.div
                key={`${card.id}-${i}`}
                initial={{ scale: 0.5, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CardFace card={card} size="lg" />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: card.owner === 'A' ? 'var(--color-text)' : 'var(--color-text-muted)', textAlign: 'center', marginTop: '4px' }}>
                  {card.owner === 'A' ? currentPair.playerA.username : currentPair.playerB.username}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {stage === 'result' || stage === 'next' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', marginTop: '16px' }}
            >
              <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: currentPair.winnerId === currentPair.playerA.id ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {currentPair.totalA}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: currentPair.winnerId === currentPair.playerB.id ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {currentPair.totalB}
                </div>
              </div>
              {currentPair.winnerId ? (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '28px', color: 'var(--color-red)' }}
                >
                  {(currentPair.winnerId === currentPair.playerA.id ? currentPair.playerA : currentPair.playerB).username} WINS THIS ROUND
                </motion.div>
              ) : (
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '28px', color: 'var(--color-text-muted)' }}>DRAW</div>
              )}
              {pairIndex < pairs.length - 1 && (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '16px' }}
                >
                  NEXT DUEL → (click to advance)
                </motion.div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div style={{ position: 'fixed', bottom: '16px', right: '16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>
        CLICK ANYWHERE TO ADVANCE
      </div>
    </div>
  )
}
