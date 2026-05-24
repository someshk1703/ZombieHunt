import { motion, AnimatePresence } from 'framer-motion'

export default function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--color-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <h1
            className="glitch-text font-display"
            style={{ fontSize: '32px', color: 'var(--color-red)', letterSpacing: '0.1em' }}
          >
            ZOMBIE HUNT
          </h1>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', letterSpacing: '0.2em' }}>
              initializing
            </span>
            <span className="pulse-dot" style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>.</span>
            <span className="pulse-dot" style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>.</span>
            <span className="pulse-dot" style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
