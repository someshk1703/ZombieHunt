import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RulesModalProps {
  onClose: () => void
}

const SECTIONS = [
  {
    icon: '🎯',
    title: 'OBJECTIVE',
    content: [
      'Survive all rounds as the last human standing — or secretly spread the infection as a zombie.',
      'The game ends when one faction is wiped out, or a single survivor remains.',
    ],
  },
  {
    icon: '🃏',
    title: 'YOUR HAND',
    content: [
      'Each player holds a hand of cards: numbered cards (1–9), and three special cards.',
      '· Zombie Card — infects your opponent if you win the round',
      '· Shotgun Card — eliminates your opponent outright',
      '· Vaccine Card — counters a zombie card played against you',
    ],
  },
  {
    icon: '⚔️',
    title: 'EACH ROUND',
    content: [
      '1. You are secretly paired with one other player.',
      '2. Negotiate via private chat — or stay silent.',
      '3. Both players secretly commit a card face-down.',
      '4. Cards are revealed simultaneously.',
      '5. Higher number wins the duel. Special cards override numbers.',
    ],
  },
  {
    icon: '💀',
    title: 'SPECIAL CARD RULES',
    content: [
      'Zombie vs Numeric → Zombie card wins; loser gets infected.',
      'Shotgun vs Infected → Infected player is eliminated.',
      'Vaccine vs Zombie → Vaccine wins; zombie card is blocked.',
      'Zombie vs Zombie → Higher number wins instead.',
      'Winning a duel → You may steal one unused card from the loser.',
    ],
  },
  {
    icon: '🧟',
    title: 'INFECTION',
    content: [
      'If you are infected, you begin secretly spreading the zombie faction.',
      'After 2 rounds of infection, you are eliminated — unless you infect someone else first.',
      'Ghosts (eliminated players) can still watch all hands and chat with other ghosts.',
    ],
  },
  {
    icon: '🏆',
    title: 'WINNING',
    content: [
      'Humans win → All zombies are eliminated.',
      'Zombies win → All humans are eliminated.',
      'Last survivor wins → Only one player remains regardless of faction.',
    ],
  },
]

export default function RulesModal({ onClose }: RulesModalProps) {
  const [activeSection, setActiveSection] = useState(0)
  const section = SECTIONS[activeSection]

  return (
    <AnimatePresence>
      <motion.div
        key="rules-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          key="rules-panel"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '680px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
            background: 'rgba(204,0,0,0.08)',
          }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '28px', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
                HOW TO PLAY
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', marginTop: '2px' }}>
                ZOMBIE HUNT — GAME RULES
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                padding: '6px 12px', letterSpacing: '0.1em',
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-red)'; (e.currentTarget).style.color = 'var(--color-red)' }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)'; (e.currentTarget).style.color = 'var(--color-text-muted)' }}
            >
              ✕ CLOSE
            </button>
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Sidebar nav */}
            <div style={{
              width: '200px', flexShrink: 0, borderRight: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', overflowY: 'auto',
              background: 'var(--color-bg)',
            }}>
              {SECTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '14px 16px', border: 'none', cursor: 'pointer',
                    background: activeSection === i ? 'rgba(204,0,0,0.12)' : 'transparent',
                    borderLeft: activeSection === i ? '2px solid var(--color-red)' : '2px solid transparent',
                    transition: 'background 150ms, border-color 150ms',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (activeSection !== i) (e.currentTarget).style.background = 'var(--color-surface)' }}
                  onMouseLeave={e => { if (activeSection !== i) (e.currentTarget).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '16px' }}>{s.icon}</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.12em',
                    color: activeSection === i ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}>
                    {s.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '28px 28px', overflowY: 'auto' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '28px' }}>{section.icon}</span>
                    <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '26px', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
                      {section.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {section.content.map((line, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: line.startsWith('·') ? '12px' : '13px',
                          color: line.startsWith('·') ? 'var(--color-text-muted)' : 'var(--color-text)',
                          lineHeight: 1.7,
                          paddingLeft: line.startsWith('·') ? '8px' : '0',
                          borderLeft: line.startsWith('·') ? '2px solid var(--color-border)' : 'none',
                        }}
                      >
                        {line}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer nav */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px', borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
          }}>
            <button
              onClick={() => setActiveSection(i => Math.max(0, i - 1))}
              disabled={activeSection === 0}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                background: 'none', border: '1px solid var(--color-border)',
                color: activeSection === 0 ? 'var(--color-border)' : 'var(--color-text-muted)',
                padding: '6px 14px', cursor: activeSection === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← PREV
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              {SECTIONS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveSection(i)}
                  style={{
                    width: '6px', height: '6px', borderRadius: '50%', cursor: 'pointer',
                    background: activeSection === i ? 'var(--color-red)' : 'var(--color-border)',
                    transition: 'background 200ms',
                  }}
                />
              ))}
            </div>

            {activeSection < SECTIONS.length - 1 ? (
              <button
                onClick={() => setActiveSection(i => Math.min(SECTIONS.length - 1, i + 1))}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                  background: 'var(--color-red)', border: 'none',
                  color: '#fff', padding: '6px 14px', cursor: 'pointer',
                }}
              >
                NEXT →
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.1em',
                  background: 'var(--color-red)', border: 'none',
                  color: '#fff', padding: '6px 14px', cursor: 'pointer',
                }}
              >
                LET'S PLAY →
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
