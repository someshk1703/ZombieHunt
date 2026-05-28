import { useEffect } from 'react'
import { motion } from 'framer-motion'
import '../../styles/glitch.css'

interface InfectionAlertProps {
  payload: { infector_username: string; round: number }
  onDone: () => void
}

export default function InfectionAlert({ payload, onDone }: InfectionAlertProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '20px', pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Scanline flicker overlay */}
      <motion.div
        animate={{ opacity: [0, 0.08, 0, 0.06, 0, 0.1, 0] }}
        transition={{ repeat: Infinity, duration: 0.35 }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.04) 2px, rgba(0,255,65,0.04) 4px)',
        }}
      />

      {/* Green border flash — 3 pulses */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0, 1, 0, 1, 0] }}
        transition={{ duration: 0.9, times: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 1] }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          border: '2px solid var(--color-green)',
          boxShadow: 'inset 0 0 80px rgba(0,255,65,0.08)',
        }}
      />

      {/* Main glitch text */}
      <motion.div
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{ textAlign: 'center', position: 'relative' }}
      >
        <div
          className="glitch-text-intense"
          data-text="🧟 YOU HAVE BEEN INFECTED"
          style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 'clamp(30px, 6vw, 54px)',
            color: 'var(--color-green)',
            letterSpacing: '0.04em',
          }}
        >
          🧟 YOU HAVE BEEN INFECTED
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            marginTop: '14px',
            letterSpacing: '0.05em',
          }}
        >
          Infected by{' '}
          <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>
            {payload.infector_username}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: '#444',
            marginTop: '8px',
            fontStyle: 'italic',
            letterSpacing: '0.08em',
          }}
        >
          A ZOMBIE CARD HAS BEEN ADDED TO YOUR HAND. KEEP IT SECRET.
        </motion.div>
      </motion.div>

      {/* Horizontal glitch slice — random jerk effect */}
      <motion.div
        animate={{
          x: [0, -8, 6, -3, 0],
          opacity: [0, 0.6, 0.4, 0.8, 0],
        }}
        transition={{ delay: 0.15, duration: 0.4, times: [0, 0.25, 0.5, 0.75, 1] }}
        style={{
          position: 'absolute',
          top: '42%', left: 0, right: 0, height: '3px',
          background: 'rgba(0,255,65,0.5)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  )
}

