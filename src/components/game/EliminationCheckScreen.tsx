import { motion } from 'framer-motion'
import { useGame } from '../../context/GameContext'

export default function EliminationCheckScreen() {
  const { players, gameState } = useGame()
  const eliminatedThisRound = players.filter(p =>
    p.status === 'eliminated' && (p as unknown as { elimination_round?: number }).elimination_round === gameState.round_number
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '24px', overflow: 'hidden',
    }}>
      {/* Scan lines */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ y: '-100%' }}
          animate={{ y: '100vh' }}
          transition={{ delay: 0.3 + i * 0.2, duration: 1, repeat: 2, ease: 'linear' }}
          style={{
            position: 'fixed', left: 0, right: 0, height: '2px',
            background: 'rgba(204,0,0,0.3)', pointerEvents: 'none', zIndex: 1,
          }}
        />
      ))}

      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '42px', color: 'var(--color-red)', letterSpacing: '0.05em', textAlign: 'center', position: 'relative', zIndex: 10 }}
      >
        ELIMINATION CHECK
      </motion.h1>

      {/* Results list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '320px', position: 'relative', zIndex: 10 }}>
        {eliminatedThisRound.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            No eliminations this round
          </motion.div>
        ) : (
          eliminatedThisRound.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <img src={p.avatar_url} alt={p.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text)', flex: 1 }}>{p.username}</span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '2px 8px',
                border: '1px solid var(--color-red)', color: 'var(--color-red)', letterSpacing: '0.1em',
              }}>
                💀 ELIMINATED
              </span>
            </motion.div>
          ))
        )}
      </div>

      {/* Continue / Game Over */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        style={{ position: 'relative', zIndex: 10 }}
      >
        <motion.p
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', letterSpacing: '0.1em' }}
        >
          ROUND {gameState.round_number + 1} BEGINS...
        </motion.p>
      </motion.div>
    </div>
  )
}
