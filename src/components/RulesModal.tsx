import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CardFace from './game/CardFace'
import { Card } from '../store/gameStore'

interface RulesModalProps {
  onClose: () => void
}

function mockCard(type: Card['type'], value: number, suit: Card['suit'] = null): Card {
  return { id: `mock-${type}-${value}`, type, value, suit, used: false }
}

const BATTLES: Array<{
  label: string
  tagColor: string
  cardA: Card
  statusA: string
  cardB: Card
  statusB: string
  outcome: string
  outcomeColor: string
  note: string
}> = [
  {
    label: 'ZOMBIE ATTACK',
    tagColor: 'var(--color-green)',
    cardA: mockCard('zombie', 15),
    statusA: 'INFECTED',
    cardB: mockCard('number', 5, 'spades'),
    statusB: 'NORMAL',
    outcome: 'OPPONENT INFECTED',
    outcomeColor: 'var(--color-green)',
    note: 'Zombie beats any number card. The losing player gains a zombie card and becomes infected.',
  },
  {
    label: 'VACCINE vs ZOMBIE',
    tagColor: '#4499ff',
    cardA: mockCard('vaccine', 0),
    statusA: 'NORMAL',
    cardB: mockCard('zombie', 15),
    statusB: 'INFECTED',
    outcome: 'ZOMBIE CURED',
    outcomeColor: '#4499ff',
    note: 'Vaccine blocks the zombie attack. The infected zombie-card player is cured and returns to normal.',
  },
  {
    label: 'SHOTGUN vs INFECTED',
    tagColor: 'var(--color-warning)',
    cardA: mockCard('shotgun', 0),
    statusA: 'NORMAL',
    cardB: mockCard('number', 7, 'hearts'),
    statusB: 'INFECTED',
    outcome: 'ELIMINATED',
    outcomeColor: 'var(--color-red)',
    note: 'Shotgun fired at an infected player eliminates them permanently. Shotgun is consumed on use.',
  },
  {
    label: 'NUMERIC DUEL',
    tagColor: 'var(--color-text-muted)',
    cardA: mockCard('number', 9, 'spades'),
    statusA: 'NORMAL',
    cardB: mockCard('number', 4, 'hearts'),
    statusB: 'NORMAL',
    outcome: '9 WINS',
    outcomeColor: 'var(--color-text)',
    note: 'Both play number cards — higher total wins the duel. Equal totals result in a DRAW.',
  },
  {
    label: 'SHOTGUN vs NORMAL',
    tagColor: 'var(--color-text-muted)',
    cardA: mockCard('shotgun', 0),
    statusA: 'NORMAL',
    cardB: mockCard('number', 3, 'clubs'),
    statusB: 'NORMAL',
    outcome: '3 WINS',
    outcomeColor: 'var(--color-text)',
    note: 'Shotgun counts as 0 against a non-infected target. The number card wins by numeric comparison.',
  },
]

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
    icon: '🥊',
    title: 'COMBAT GUIDE',
    content: [],
    visual: true as const,
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
  const [battleIndex, setBattleIndex] = useState(0)
  const section = SECTIONS[activeSection]
  const isVisual = 'visual' in section && section.visual

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

                  {isVisual ? (
                    <div>
                      {/* Battle selector tabs */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        {BATTLES.map((b, i) => (
                          <button
                            key={i}
                            onClick={() => setBattleIndex(i)}
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                              letterSpacing: '0.1em', padding: '4px 10px',
                              border: `1px solid ${battleIndex === i ? b.tagColor : 'var(--color-border)'}`,
                              background: battleIndex === i ? `${b.tagColor}18` : 'transparent',
                              color: battleIndex === i ? b.tagColor : 'var(--color-text-muted)',
                              cursor: 'pointer', transition: 'all 150ms',
                            }}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>

                      {/* Battle scenario */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={battleIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                        >
                          {(() => {
                            const battle = BATTLES[battleIndex]
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                {/* Cards row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                  {/* Player A */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                                      letterSpacing: '0.15em', color: 'var(--color-text-muted)',
                                    }}>
                                      PLAYER A
                                    </div>
                                    <CardFace card={battle.cardA} size="md" />
                                    <div style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                                      letterSpacing: '0.1em', padding: '2px 8px',
                                      border: `1px solid ${battle.statusA === 'INFECTED' ? 'var(--color-green)' : 'var(--color-border)'}`,
                                      color: battle.statusA === 'INFECTED' ? 'var(--color-green)' : 'var(--color-text-muted)',
                                    }}>
                                      {battle.statusA}
                                    </div>
                                  </div>

                                  {/* VS */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '32px', color: 'var(--color-border)' }}>VS</div>
                                  </div>

                                  {/* Player B */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                                      letterSpacing: '0.15em', color: 'var(--color-text-muted)',
                                    }}>
                                      PLAYER B
                                    </div>
                                    <CardFace card={battle.cardB} size="md" />
                                    <div style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                                      letterSpacing: '0.1em', padding: '2px 8px',
                                      border: `1px solid ${battle.statusB === 'INFECTED' ? 'var(--color-green)' : 'var(--color-border)'}`,
                                      color: battle.statusB === 'INFECTED' ? 'var(--color-green)' : 'var(--color-text-muted)',
                                    }}>
                                      {battle.statusB}
                                    </div>
                                  </div>
                                </div>

                                {/* Arrow + outcome */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', color: 'var(--color-border)' }}>↓</div>
                                  <motion.div
                                    animate={{ scale: [1, 1.04, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    style={{
                                      fontFamily: "'Bebas Neue', cursive", fontSize: '28px',
                                      letterSpacing: '0.1em', color: battle.outcomeColor,
                                      padding: '6px 20px',
                                      border: `1px solid ${battle.outcomeColor}`,
                                      background: `${battle.outcomeColor}12`,
                                    }}
                                  >
                                    {battle.outcome}
                                  </motion.div>
                                </div>

                                {/* Explanation */}
                                <p style={{
                                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
                                  color: 'var(--color-text-muted)', lineHeight: 1.7,
                                  textAlign: 'center', maxWidth: '340px',
                                  borderTop: '1px solid var(--color-border)', paddingTop: '16px',
                                }}>
                                  {battle.note}
                                </p>

                                {/* Prev / next battle */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                  <button
                                    onClick={() => setBattleIndex(i => Math.max(0, i - 1))}
                                    disabled={battleIndex === 0}
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                                      background: 'none', border: '1px solid var(--color-border)',
                                      color: battleIndex === 0 ? 'var(--color-border)' : 'var(--color-text-muted)',
                                      padding: '4px 12px', cursor: battleIndex === 0 ? 'not-allowed' : 'pointer',
                                    }}
                                  >← PREV</button>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                                    {battleIndex + 1} / {BATTLES.length}
                                  </span>
                                  <button
                                    onClick={() => setBattleIndex(i => Math.min(BATTLES.length - 1, i + 1))}
                                    disabled={battleIndex === BATTLES.length - 1}
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                                      background: 'none', border: '1px solid var(--color-border)',
                                      color: battleIndex === BATTLES.length - 1 ? 'var(--color-border)' : 'var(--color-text-muted)',
                                      padding: '4px 12px', cursor: battleIndex === BATTLES.length - 1 ? 'not-allowed' : 'pointer',
                                    }}
                                  >NEXT →</button>
                                </div>
                              </div>
                            )
                          })()}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  ) : (
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
                  )}
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
