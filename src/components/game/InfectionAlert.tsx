import { motion } from 'framer-motion'

interface InfectionAlertProps {
  payload: { infector_username: string; round: number }
  onDone: () => void
}

export default function InfectionAlert({ payload, onDone }: InfectionAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => {
        setTimeout(onDone, 3000)
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,255,65,0.05)',
        border: '1px solid var(--color-green)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '12px', pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{ scale: [0.95, 1, 0.98] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(32px, 7vw, 42px)', color: 'var(--color-green)', letterSpacing: '0.05em' }}>
          🧟 YOU HAVE BEEN INFECTED
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          Infected by {payload.infector_username}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
          Keep it secret. Stay alive.
        </div>
      </motion.div>
    </motion.div>
  )
}
