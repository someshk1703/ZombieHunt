import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../store/gameStore'
import { useGameStore } from '../../store/gameStore'
import CardFace from './CardFace'
import CardBack from './CardBack'
import HandPanel from './HandPanel'
import DuelChat from './DuelChat'
import InfectionAlert from './InfectionAlert'
import { useToast } from '../Toast'

export default function GameRoundScreen() {
  const { gameState, myPlayer, players, room, isHost, myHand } = useGame()
  const { user } = useGameStore()
  const { showToast } = useToast()

  const [playZoneCards, setPlayZoneCards] = useState<Card[]>([])
  const [committed, setCommitted] = useState(false)
  const [opponentCommitted, setOpponentCommitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isNegotiating, setIsNegotiating] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [infectionPayload, setInfectionPayload] = useState<{ infector_username: string; round: number } | null>(null)

  // Find my opponent in current pairs
  const myPair = (gameState.pairs ?? []).find(pair => {
    const pA = players.find(p => p.id === pair[0])
    const pB = players.find(p => p.id === pair[1])
    return pA?.user_id === user?.id || pB?.user_id === user?.id
  })
  const opponentId = myPair ? (players.find(p => p.id === myPair[0])?.user_id === user?.id ? myPair[1] : myPair[0]) : null
  const opponent = opponentId ? players.find(p => p.id === opponentId) : null

  // Timer logic
  const deadline = isNegotiating
    ? (gameState as unknown as { negotiation_deadline?: string }).negotiation_deadline
    : gameState.phase_deadline

  useEffect(() => {
    if (!deadline) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        if (isNegotiating) {
          setIsNegotiating(false)
          setChatOpen(false)
          showToast('⚡ COMMIT YOUR CARDS NOW', 'info')
          if (isHost) {
            supabase.from('game_state').update({ phase_deadline: new Date(Date.now() + 25000).toISOString() }).eq('id', gameState.id)
          }
        } else if (!committed) {
          autoCommit()
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [deadline, isNegotiating, committed])

  // Check if negotiation deadline passed on mount
  useEffect(() => {
    const negDeadline = (gameState as unknown as { negotiation_deadline?: string }).negotiation_deadline
    if (negDeadline && new Date(negDeadline).getTime() < Date.now()) {
      setIsNegotiating(false)
      setChatOpen(false)
    }
  }, [])

  // Watch for opponent commitment via real-time committed_cards changes
  useEffect(() => {
    if (!opponent) return
    const cc = gameState.committed_cards as Record<string, unknown>
    setOpponentCommitted(!!cc?.[opponent.user_id])
  }, [gameState.committed_cards, opponent])

  // Subscribe to private infection channel
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`private:${user.id}`)
      .on('broadcast', { event: 'infected' }, (payload: { payload: { infector_username: string; round: number } }) => {
        setInfectionPayload(payload.payload)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  const autoCommit = useCallback(async () => {
    if (committed) return
    const numCards = myHand.filter(c => c.type === 'number' && !c.used)
    const card = numCards.length ? numCards.reduce((min, c) => c.value < min.value ? c : min) : myHand.find(c => !c.used)
    if (!card) return
    await doCommit([card])
    showToast('⚠ TIME\'S UP — Lowest card auto-committed', 'info')
  }, [myHand, committed])

  async function doCommit(cards: Card[]) {
    setCommitted(true)
    try {
      await supabase.rpc('commit_cards', { p_room_id: room.id, p_cards: JSON.stringify(cards) })
    } catch {
      setCommitted(false)
      showToast('Failed to commit. Try again.', 'error')
    }
  }

  function handleCommit() {
    if (playZoneCards.length === 0 || committed) return
    doCommit(playZoneCards)
  }

  function addToPlayZone(card: Card) {
    if (committed) return
    setPlayZoneCards(prev => [...prev, card])
  }

  function removeFromPlayZone(card: Card) {
    if (committed) return
    setPlayZoneCards(prev => prev.filter(c => c.id !== card.id))
  }

  const numericTotal = playZoneCards.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
  const specialInZone = playZoneCards.find(c => c.type !== 'number')

  const timerColor = timeLeft > 10 ? 'var(--color-text)' : timeLeft > 5 ? 'var(--color-warning)' : 'var(--color-red)'
  const timerDisplay = isNegotiating
    ? `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
    : String(timeLeft)

  const infectionStatus = myPlayer.status === 'infected'


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Infection alert */}
      <AnimatePresence>
        {infectionPayload && (
          <InfectionAlert payload={infectionPayload} onDone={() => setInfectionPayload(null)} />
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <div style={{
        height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
      }}>
        <div>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-red)' }}>
            ROUND {gameState.round_number}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
            {isNegotiating ? 'NEGOTIATION' : committed ? 'WAITING' : 'COMMIT CARDS'}
          </span>
        </div>
        <motion.span
          animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.6 }}
          style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '32px', color: timerColor }}
        >
          {timerDisplay}
        </motion.span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: infectionStatus ? 'var(--color-green)' : 'var(--color-text-muted)', ...(infectionStatus ? { boxShadow: '0 0 6px var(--color-green)', animation: 'pulse 1s infinite' } : {}) }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: infectionStatus ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
              {infectionStatus ? 'INFECTED' : 'CLEAR'}
            </span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
            {myHand.filter(c => !c.used).length} CARDS
          </span>
        </div>
      </div>

      {/* MAIN BATTLEFIELD */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Duel chat panel */}
        <DuelChat
          isOpen={chatOpen}
          onToggle={() => setChatOpen(v => !v)}
          opponent={opponent ?? null}
          isNegotiating={isNegotiating}
          myPair={myPair ?? null}
        />

        {/* Battlefield: opponent + player zones */}
        <div style={{ flex: 1, display: 'flex', transition: 'margin-left 200ms', marginLeft: chatOpen ? '260px' : '32px' }}>
          {/* OPPONENT ZONE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', borderRight: '1px solid var(--color-border)' }}>
            {opponent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <img src={opponent.avatar_url} alt={opponent.username} style={{
                    width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-surface)',
                    ...(opponent.is_bot ? { border: '2px solid var(--color-green)' } : {})
                  }} />
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: opponent.is_bot ? 'var(--color-green)' : 'var(--color-text)' }}>
                      {opponent.username}
                      {opponent.is_bot && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-green)', marginLeft: '6px', border: '1px solid var(--color-green)', padding: '1px 4px' }}>BOT</span>}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {opponent.hand?.filter((c: Card) => !c.used).length ?? 0} cards remaining
                    </div>
                  </div>
                </div>
                {!opponentCommitted && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}
                  >
                    • • •
                  </motion.div>
                )}
                {/* Opponent play zone */}
                <div style={{
                  width: '200px', height: '140px', border: '1px dashed var(--color-border)', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  {opponentCommitted ? (
                    <AnimatePresence>
                      <div style={{ display: 'flex', gap: '-8px' }}>
                        {[0, 1, 2].map(i => (
                          <motion.div key={i}
                            initial={{ y: -60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            style={{ marginLeft: i > 0 ? '-16px' : 0 }}
                          >
                            <CardBack width={56} height={76} />
                          </motion.div>
                        ))}
                      </div>
                      <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>CARDS COMMITTED</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-green)' }}>🔒 LOCKED IN</div>
                      </div>
                    </AnimatePresence>
                  ) : (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>WAITING...</span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--color-text-muted)' }}>Bye round — no opponent</div>
            )}
          </div>

          {/* PLAYER ZONE (YOU) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img src={myPlayer.avatar_url} alt="You" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-red)' }} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-text)' }}>
                  YOU <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-red)', border: '1px solid var(--color-red)', padding: '1px 4px' }}>YOU</span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {myHand.filter(c => !c.used).length} cards remaining
                </div>
              </div>
            </div>

            {/* Play zone */}
            <div style={{
              width: '200px', minHeight: '140px', border: `1px dashed ${!isNegotiating && !committed ? 'var(--color-red)' : 'var(--color-border)'}`,
              position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.02)', padding: '8px',
              transition: 'border-color 300ms',
            }}>
              {playZoneCards.length === 0 ? (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  {isNegotiating ? 'WAITING...' : 'DROP CARDS HERE'}
                </span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                  {playZoneCards.map(card => (
                    <div key={card.id} style={{ position: 'relative' }}>
                      <CardFace card={card} size="sm" />
                      {!committed && (
                        <button
                          onClick={() => removeFromPlayZone(card)}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '16px', height: '16px', background: 'var(--color-red)',
                            border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Running total */}
            {playZoneCards.length > 0 && (
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '20px', color: 'var(--color-text)' }}>
                  TOTAL: {numericTotal}
                </div>
                {specialInZone && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: specialInZone.type === 'zombie' ? 'var(--color-green)' : specialInZone.type === 'shotgun' ? 'var(--color-warning)' : '#4499ff' }}>
                    ⚡ {specialInZone.type.toUpperCase()} CARD ACTIVE
                  </div>
                )}
              </div>
            )}

            {/* Commit button */}
            <AnimatePresence>
              {playZoneCards.length > 0 && !committed && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCommit}
                  disabled={isNegotiating}
                  title={isNegotiating ? 'Negotiation in progress...' : undefined}
                  style={{
                    marginTop: '12px', width: '200px', height: '36px',
                    fontFamily: "'Bebas Neue', cursive", fontSize: '16px',
                    background: isNegotiating ? 'var(--color-surface)' : 'var(--color-red)',
                    color: isNegotiating ? 'var(--color-text-muted)' : '#fff',
                    border: 'none', cursor: isNegotiating ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.05em', transition: 'all 200ms',
                  }}
                >
                  {isNegotiating ? 'NEGOTIATION IN PROGRESS...' : 'LOCK IN'}
                </motion.button>
              )}
            </AnimatePresence>

            {committed && (
              <div style={{
                marginTop: '12px', width: '200px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,255,65,0.1)', border: '1px solid var(--color-green)',
                fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: 'var(--color-green)',
              }}>
                ✓ COMMITTED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HAND PANEL */}
      <HandPanel
        playZoneCardIds={new Set(playZoneCards.map(c => c.id))}
        onAddToZone={addToPlayZone}
        onRemoveFromZone={removeFromPlayZone}
        committed={committed}
        isNegotiating={isNegotiating}
      />
    </div>
  )
}
