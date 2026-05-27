import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../../context/GameContext'

interface PlayerReveal {
  playerId: string
  username: string
  avatarUrl: string
  finalStatus: 'alive' | 'infected' | 'eliminated'
  isZombie: boolean
  eliminationRound: number | null
  revealOrder: number
}

export default function WinRevealScreen() {
  const { gameState } = useGame()
  const navigate = useNavigate()
  const { code } = useParams()
  const [phase, setPhase] = useState<'game_over' | 'reveals' | 'faction'>('game_over')
  const [revealIndex, setRevealIndex] = useState(-1)
  const [revealedPlayers, setRevealedPlayers] = useState<PlayerReveal[]>([])
  const [showResultsBtn, setShowResultsBtn] = useState(false)

  const revealSequence: PlayerReveal[] = (gameState as unknown as { reveal_sequence?: PlayerReveal[] }).reveal_sequence ?? []
  const winnerFaction = (gameState as unknown as { winner_faction?: string }).winner_faction
  const winnerPlayerId = (gameState as unknown as { winner_player_id?: string }).winner_player_id

  // Dead Walk case: human faction wins with exactly one surviving human.
  // We infer this from a concrete human winner id being present.
  const isDeadWalkCase = winnerFaction === 'humans' && Boolean(winnerPlayerId)

  // Phase sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveals'), 1000)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (phase !== 'reveals') return
    if (revealIndex >= revealSequence.length - 1) {
      setTimeout(() => setPhase('faction'), 1000)
      return
    }
    const timer = setTimeout(() => {
      const next = revealIndex + 1
      setRevealIndex(next)
      setRevealedPlayers(prev => [...prev, revealSequence[next]])
    }, 2000)
    return () => clearTimeout(timer)
  }, [phase, revealIndex, revealSequence.length])

  useEffect(() => {
    if (phase === 'faction') {
      setTimeout(() => setShowResultsBtn(true), 3000)
    }
  }, [phase])

  function handleClick() {
    if (phase === 'reveals' && revealIndex < revealSequence.length - 1) {
      const next = revealIndex + 1
      setRevealIndex(next)
      setRevealedPlayers(prev => [...prev, revealSequence[next]])
    }
  }

  const factionBg = winnerFaction === 'humans' ? '#050510' : '#000a00'
  const factionColor = winnerFaction === 'humans' ? '#4499ff' : 'var(--color-green)'
  const factionText = winnerFaction === 'humans'
    ? (isDeadWalkCase ? 'THE DEAD WALK' : 'HUMANITY PREVAILS')
    : 'ZOMBIES WON'
  const factionSub = winnerFaction === 'humans'
    ? (isDeadWalkCase ? 'ONE HUMAN STANDS. NO INFECTED REMAIN.' : undefined)
    : 'ALL HUMANS HAVE FALLEN'

  const currentReveal = revealIndex >= 0 ? revealSequence[revealIndex] : null
  const isWinner = currentReveal?.playerId === winnerPlayerId

  function cardBg(p: PlayerReveal): string {
    if (p.playerId === winnerPlayerId) return winnerFaction === 'humans' ? 'rgba(0,0,40,0.9)' : 'rgba(0,40,0,0.9)'
    if (p.finalStatus === 'eliminated') return 'rgba(40,0,0,0.9)'
    if (p.isZombie) return 'rgba(0,30,0,0.9)'
    return 'rgba(20,20,20,0.9)'
  }

  function cardLabel(p: PlayerReveal): { text: string; color: string } {
    if (p.playerId === winnerPlayerId) return { text: '👑 WINNER', color: winnerFaction === 'humans' ? '#4499ff' : 'var(--color-green)' }
    if (p.finalStatus === 'eliminated' && !p.isZombie) return { text: '💀 ELIMINATED', color: 'var(--color-text-muted)' }
    if (p.finalStatus === 'eliminated' && p.isZombie) return { text: '🧟 TURNED', color: 'var(--color-green)' }
    if (p.isZombie) return { text: '🧟 INFECTED SURVIVOR', color: 'var(--color-green)' }
    return { text: '✓ SURVIVED', color: 'var(--color-text)' }
  }

  return (
    <div onClick={handleClick} style={{ minHeight: '100vh', background: phase === 'faction' ? factionBg : '#000', position: 'relative', overflow: 'hidden', transition: 'background 1s', cursor: 'pointer' }}>
      {/* GAME OVER flash */}
      <AnimatePresence>
        {phase === 'game_over' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
          >
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(48px, 10vw, 96px)', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
              GAME OVER
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous revealed players — thumbnails at top */}
      {phase === 'reveals' && revealedPlayers.length > 1 && (
        <div style={{ position: 'fixed', top: '60px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 15, flexWrap: 'wrap', padding: '0 16px' }}>
          {revealedPlayers.slice(0, -1).map((p, i) => (
            <motion.div key={`${p.playerId}-${i}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              style={{ width: '48px', height: '64px', background: cardBg(p), border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
              <img src={p.avatarUrl} alt={p.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '7px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2px' }}>{p.username.slice(0, 6)}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Current reveal — center card */}
      {phase === 'reveals' && currentReveal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <motion.div
            key={currentReveal.playerId}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ width: '160px', height: '200px', background: cardBg(currentReveal), border: `2px solid ${cardLabel(currentReveal).color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px' }}
          >
            <img src={currentReveal.avatarUrl} alt={currentReveal.username} style={{ width: '80px', height: '80px', borderRadius: '50%', border: `2px solid ${cardLabel(currentReveal).color}`, ...(isWinner ? { boxShadow: `0 0 20px ${cardLabel(currentReveal).color}` } : {}) }} />
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '20px', color: 'var(--color-text)', textAlign: 'center' }}>{currentReveal.username}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: cardLabel(currentReveal).color, textAlign: 'center' }}>{cardLabel(currentReveal).text}</span>
            {isWinner && (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: factionColor }}>
                ★ WINNER ★
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Faction victory screen */}
      <AnimatePresence>
        {phase === 'faction' && (
          <motion.div
            key="faction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 20 }}
          >
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 8vw, 72px)', color: factionColor, letterSpacing: '0.05em', textAlign: 'center' }}>
              {factionText}
            </motion.div>
            {factionSub && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.6 }}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: factionColor }}>
                {factionSub}
              </motion.div>
            )}
            <AnimatePresence>
              {showResultsBtn && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={e => { e.stopPropagation(); navigate(`/results/${code}`) }}
                  style={{
                    marginTop: '24px', padding: '12px 32px',
                    fontFamily: "'Bebas Neue', cursive", fontSize: '18px', letterSpacing: '0.05em',
                    background: factionColor === '#4499ff' ? 'rgba(0,0,80,0.8)' : 'rgba(0,60,0,0.8)',
                    border: `2px solid ${factionColor}`, color: factionColor,
                    cursor: 'pointer',
                  }}
                >
                  VIEW RESULTS →
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
