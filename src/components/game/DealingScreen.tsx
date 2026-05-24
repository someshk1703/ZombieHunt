import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import CardBack from './CardBack'
import CardFace from './CardFace'
import { Card } from '../../store/gameStore'

type Phase = 'title' | 'rain' | 'flip' | 'done'

export default function DealingScreen() {
  const { myHand, isHost, gameState } = useGame()
  const [phase, setPhase] = useState<Phase>('title')
  const [flippedCount, setFlippedCount] = useState(0)

  useEffect(() => {
    // Phase A: title (0–0.5s)
    const t1 = setTimeout(() => setPhase('rain'), 500)
    // Phase B: card rain (0.5–2.5s)
    const t2 = setTimeout(() => setPhase('flip'), 2500)
    // Phase C: flip cards one by one
    const flips: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < 7; i++) {
      flips.push(setTimeout(() => setFlippedCount(i + 1), 2500 + i * 100))
    }
    // Phase D: transition at 3.5s (host triggers phase change)
    const t3 = setTimeout(async () => {
      setPhase('done')
      if (isHost) {
        const phaseDeadline = new Date(Date.now() + 15000).toISOString()
        await supabase
          .from('game_state')
          .update({ phase: 'hand_review', phase_deadline: phaseDeadline })
          .eq('id', gameState.id)
      }
    }, 3500)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      flips.forEach(clearTimeout)
    }
  }, [])

  const cards: (Card | null)[] = myHand.length > 0
    ? myHand
    : Array(7).fill(null)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '40px', zIndex: 20,
    }}>
      {/* Title flash */}
      <AnimatePresence>
        {phase === 'title' && (
          <motion.h1
            key="title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: '48px', color: 'var(--color-red)',
              letterSpacing: '0.05em', position: 'absolute',
            }}
          >
            DEALING CARDS
          </motion.h1>
        )}
      </AnimatePresence>

      {/* Hand row */}
      {phase !== 'title' && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'flex-end',
          position: 'relative', minHeight: '160px',
        }}>
          {cards.map((card, i) => {
            const isFlipped = flippedCount > i && card && phase === 'flip' || phase === 'done'

            return (
              <motion.div
                key={i}
                initial={{ y: -200, rotate: Math.random() * 30 - 15, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                transition={{
                  delay: 0.2 + i * 0.2,
                  type: 'spring', stiffness: 200, damping: 18,
                }}
                style={{ position: 'relative', perspective: '600px' }}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4, delay: isFlipped ? 0 : 0 }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative', width: 88, height: 120 }}
                >
                  {/* Card back face */}
                  <div style={{ position: 'absolute', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <CardBack width={88} height={120} />
                  </div>
                  {/* Card front face */}
                  <div style={{
                    position: 'absolute',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}>
                    {card
                      ? <CardFace card={card} size="md" />
                      : <CardBack width={88} height={120} />
                    }
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Status text */}
      {(phase === 'rain' || phase === 'flip') && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.15em',
          }}
        >
          {phase === 'rain' ? 'DISTRIBUTING CARDS...' : 'REVEALING YOUR HAND...'}
        </motion.p>
      )}
    </div>
  )
}
