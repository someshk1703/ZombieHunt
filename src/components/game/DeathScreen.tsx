import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { GamePlayer } from '../../context/GameContext'

interface DeathScreenProps {
  myPlayer: GamePlayer
  onDone: () => void
}

export default function DeathScreen({ myPlayer, onDone }: DeathScreenProps) {
  const cause = (myPlayer as unknown as { elimination_cause?: string }).elimination_cause
  const roundsSurvived = (myPlayer as unknown as { rounds_survived?: number }).rounds_survived ?? 0
  const cardsStolen = (myPlayer as unknown as { cards_stolen?: number }).cards_stolen ?? 0
  const infectionsCaused = (myPlayer as unknown as { infections_caused?: number }).infections_caused ?? 0

  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000000', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
      }}
    >
      {/* Phase 1: white flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ position: 'fixed', inset: 0, background: '#fff', pointerEvents: 'none' }}
      />

      {/* Phase 2: Death message */}
      <motion.div
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 7vw, 64px)', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
          YOU HAVE BEEN ELIMINATED
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: cause === 'shotgun' ? 'var(--color-warning)' : 'var(--color-green)', marginTop: '8px' }}
        >
          {cause === 'shotgun' ? '💀 SHOT DOWN' : cause === 'infection' ? '🧟 TURNED — INFECTION CLAIMED YOU' : '💀 ELIMINATED'}
        </motion.div>
      </motion.div>

      {/* Phase 3: Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', marginTop: '16px' }}
      >
        {[
          { label: 'SURVIVED', value: roundsSurvived, unit: 'ROUNDS' },
          { label: 'CARDS STOLEN', value: cardsStolen, unit: '' },
          { label: 'INFECTED', value: infectionsCaused, unit: 'PLAYERS' },
        ].map(({ label, value, unit }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 + i * 0.15 }}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)' }}
          >
            {label.padEnd(16)} <span style={{ color: 'var(--color-text)' }}>{value}</span> {unit}
          </motion.div>
        ))}
      </motion.div>

      {/* Phase 4: Transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        style={{ position: 'absolute', bottom: '48px' }}
      >
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}
        >
          ENTERING GHOST MODE..._
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
