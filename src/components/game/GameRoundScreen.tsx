import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, DragEndEvent, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core'
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
import TimerDisplay from '../TimerDisplay'

const MAX_SLOTS = 4

function DroppableSlot({ id, card, onRemove, committed }: { id: string; card: Card | null; onRemove: (card: Card) => void; committed: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        width: '72px', height: '100px',
        border: `1.5px dashed ${isOver ? 'var(--color-red)' : card ? '#505055' : '#383838'}`,
        background: isOver ? 'rgba(204,0,0,0.08)' : card ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', transition: 'border-color 150ms, background 150ms',
        boxShadow: isOver ? '0 0 8px rgba(204,0,0,0.2)' : 'none',
      }}
    >
      {card ? (
        <>
          <CardFace card={card} size="sm" />
          {!committed && (
            <button
              onClick={() => onRemove(card)}
              style={{
                position: 'absolute', top: '-7px', right: '-7px',
                width: '18px', height: '18px', background: 'var(--color-red)',
                border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}
            >×</button>
          )}
        </>
      ) : (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#383838', letterSpacing: '0.1em' }}>
          SLOT {parseInt(id.split('-')[1]) + 1}
        </span>
      )}
    </div>
  )
}

export default function GameRoundScreen() {
  const { gameState, myPlayer, players, room, isHost, myHand } = useGame()
  const { user } = useGameStore()
  const { showToast } = useToast()

  const [playZoneSlots, setPlayZoneSlots] = useState<(Card | null)[]>([null, null, null, null])
  const [committed, setCommitted] = useState(false)
  const [opponentCommitted, setOpponentCommitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isNegotiating, setIsNegotiating] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [infectionPayload, setInfectionPayload] = useState<{ infector_username: string; round: number } | null>(null)
  const [myPairDone, setMyPairDone] = useState(false)
  const [hasSeenMyResult, setHasSeenMyResult] = useState(false)
  const revealCalledRef = useRef(false)

  // Reset local state when round advances
  useEffect(() => {
    setPlayZoneSlots([null, null, null, null])
    setCommitted(false)
    setOpponentCommitted(false)
    setIsNegotiating(true)
    setChatOpen(true)
    setMyPairDone(false)
    setHasSeenMyResult(false)
    revealCalledRef.current = false
  }, [gameState.round_number])

  // Find my opponent in current pairs
  const myPair = (gameState.pairs ?? []).find(pair =>
    Array.isArray(pair) && pair.includes(myPlayer.id)
  )
  const opponentId = myPair
    ? (myPair[0] === myPlayer.id ? myPair[1] : myPair[0])
    : null
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
            supabase.from('game_state').update({ phase_deadline: new Date(Date.now() + 30000).toISOString() }).eq('id', gameState.id)
          }
        } else if (!committed) {
          autoCommit()
        } else if (isHost && !revealCalledRef.current) {
          // All players should have committed by now — advance to reveal
          revealCalledRef.current = true
          setTimeout(async () => {
            await supabase.from('game_state').update({ phase: 'reveal' }).eq('id', gameState.id)
          }, 3000)
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [deadline, isNegotiating, committed])

  // Host: auto-commit cards for bot players when negotiation phase ends
  useEffect(() => {
    if (isNegotiating || !isHost) return

    async function autoBotCommit() {
      // Read fresh state FIRST — never use stale closure value as the base
      const { data: fresh } = await supabase
        .from('game_state').select('committed_cards').eq('id', gameState.id).single()
      const freshCommitted = (fresh?.committed_cards as Record<string, unknown>) ?? {}

      const botPlayers = players.filter(p => p.is_bot && p.status !== 'eliminated')
      if (botPlayers.length === 0) return

      // Only build commits for bots — never include human keys to avoid overwriting them
      const newBotCommits: Record<string, unknown> = {}
      let anyChange = false

      for (const bot of botPlayers) {
        // Only commit if this bot is paired this round
        const inPair = (gameState.pairs ?? []).some((pair: string[]) => pair.includes(bot.id))
        if (!inPair) continue
        // Skip if already committed (check fresh, not stale closure)
        if (freshCommitted[bot.user_id]) continue

        const botHand = (bot.hand ?? []) as Card[]
        const available = botHand.filter(c => !c.used)
        if (available.length === 0) continue

        // Bot strategy: play lowest number card, fallback to any card
        const numberCards = available.filter(c => c.type === 'number')
        const pick = numberCards.length > 0
          ? numberCards.reduce((min, c) => c.value < min.value ? c : min)
          : available[Math.floor(Math.random() * available.length)]

        newBotCommits[bot.user_id] = [pick]
        anyChange = true
      }

      if (!anyChange) return

      // Merge fresh (latest DB) + only new bot commits — human keys are never in newBotCommits
      const merged = { ...freshCommitted, ...newBotCommits }
      await supabase.from('game_state').update({ committed_cards: merged }).eq('id', gameState.id)
    }

    // Small delay so human commits land first, then bot fills gaps
    const t = setTimeout(autoBotCommit, 1500)
    return () => clearTimeout(t)
  }, [isNegotiating, isHost])

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

  // Show inline duel result when both in MY pair have committed
  useEffect(() => {
    if (myPairDone || !opponent) return
    const cc = gameState.committed_cards as Record<string, unknown>
    if (cc?.[myPlayer.user_id] && cc?.[opponent.user_id]) {
      setMyPairDone(true)
    }
  }, [gameState.committed_cards, opponent, myPlayer.user_id, myPairDone])

  // When ALL pairs committed, host calls resolve-round directly (skip global reveal phase)
  useEffect(() => {
    if (!isHost || revealCalledRef.current) return
    if (gameState.phase !== 'blind_action') return
    const cc = gameState.committed_cards as Record<string, unknown>
    const allPairs = gameState.pairs ?? []
    if (allPairs.length === 0) return
    const allCommitted = allPairs.every((pair: string[]) => {
      const pA = players.find(p => p.id === pair[0])
      const pB = players.find(p => p.id === pair[1])
      return pA && pB && cc[pA.user_id] && cc[pB.user_id]
    })
    if (allCommitted) {
      revealCalledRef.current = true
      // Short delay so players briefly see the inline pair reveal before the phase flips
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ room_id: room.id, round_number: gameState.round_number }),
        })
      }, 800)
    }
  }, [gameState.committed_cards, gameState.pairs, gameState.phase, isHost, players, room.id, gameState.round_number])

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

  const playZoneCards = playZoneSlots.filter((c): c is Card => c !== null)
  const playZoneCardIds = new Set(playZoneCards.map(c => c.id))

  function handleCommit() {
    if (playZoneCards.length === 0 || committed) return
    doCommit(playZoneCards)
  }

  function addToPlayZone(card: Card) {
    if (committed) return
    setPlayZoneSlots(prev => {
      const emptyIdx = prev.findIndex(s => s === null)
      if (emptyIdx === -1) return prev // all slots full
      const next = [...prev]
      next[emptyIdx] = card
      return next
    })
  }

  function removeFromPlayZone(card: Card) {
    if (committed) return
    setPlayZoneSlots(prev => prev.map(s => s?.id === card.id ? null : s))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || committed || isNegotiating) return
    const card: Card = active.data.current?.card
    if (!card) return
    const slotIndex = parseInt((over.id as string).split('-')[1])
    if (isNaN(slotIndex)) return
    setPlayZoneSlots(prev => {
      // Don't add if already in zone
      if (prev.some(s => s?.id === card.id)) return prev
      // Don't exceed max
      if (prev.filter(Boolean).length >= MAX_SLOTS) return prev
      const next = [...prev]
      // Place in specific slot, or find first empty
      if (next[slotIndex] === null) {
        next[slotIndex] = card
      } else {
        const emptyIdx = next.findIndex(s => s === null)
        if (emptyIdx !== -1) next[emptyIdx] = card
      }
      return next
    })
  }

  const [draggedCard, setDraggedCard] = useState<Card | null>(null)

  const numericTotal = playZoneCards.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
  const specialInZone = playZoneCards.find(c => c.type !== 'number')

  const timerColor = timeLeft > 10 ? 'var(--color-text)' : timeLeft > 5 ? 'var(--color-warning)' : 'var(--color-red)'
  const timerDisplay = isNegotiating
    ? `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
    : String(timeLeft)

  const infectionStatus = myPlayer.status === 'infected'

  return (
    <DndContext
      sensors={sensors}
      onDragStart={event => setDraggedCard(event.active.data.current?.card ?? null)}
      onDragEnd={event => { handleDragEnd(event); setDraggedCard(null) }}
      onDragCancel={() => setDraggedCard(null)}
    >
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
        padding: '0 16px', background: '#141416', borderBottom: '1px solid #383838',
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>
        <div>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-red)' }}>
            ROUND {gameState.round_number}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
            {isNegotiating ? 'NEGOTIATION' : committed ? 'WAITING' : 'COMMIT CARDS'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isNegotiating && (
            <button
              onClick={async () => {
                await supabase.from('game_state').update({
                  negotiation_deadline: new Date(Date.now() - 1000).toISOString(),
                }).eq('id', gameState.id)
              }}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.1em',
                background: 'transparent', border: '1px solid var(--color-text-muted)',
                color: 'var(--color-text-muted)', padding: '3px 10px', cursor: 'pointer',
              }}
            >
              SKIP ›
            </button>
          )}
          <motion.span
            animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            <TimerDisplay
              deadline={deadline ?? null}
              totalSeconds={isNegotiating ? (room.settings.round_timer_seconds ?? 120) : 30}
              size="md"
            />
          </motion.span>
        </div>
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
          <div style={{ flex: 1, display: 'flex', transition: 'margin-left 200ms', marginLeft: chatOpen ? '260px' : '32px', position: 'relative' }}>
            {/* Zone divider */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%',
              width: '1px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(204,0,0,0.3) 30%, rgba(204,0,0,0.3) 70%, transparent 100%)',
              boxShadow: '0 0 16px rgba(204,0,0,0.15)',
              pointerEvents: 'none', zIndex: 2,
            }} />
            {/* OPPONENT ZONE */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px',
              background: 'linear-gradient(160deg, rgba(28,10,10,0.7) 0%, rgba(18,8,8,0.5) 100%)',
              border: '1px solid rgba(204,0,0,0.14)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
            }}>
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
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px',
              background: 'linear-gradient(200deg, rgba(10,20,10,0.7) 0%, rgba(8,16,8,0.5) 100%)',
              border: '1px solid rgba(0,255,65,0.1)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <img src={myPlayer.avatar_url} alt="You" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-red)' }} />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-text)' }}>
                  {myPlayer.username} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-red)', border: '1px solid var(--color-red)', padding: '1px 4px' }}>YOU</span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {myHand.filter(c => !c.used).length} cards remaining
                </div>
              </div>
            </div>

            {/* 4-slot Play zone */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: isNegotiating ? 'var(--color-text-muted)' : committed ? 'var(--color-green)' : 'var(--color-red)', letterSpacing: '0.12em' }}>
                {isNegotiating ? '— NEGOTIATION PHASE —' : committed ? '✓ CARDS LOCKED IN' : '— DRAG OR TAP CARDS TO PLAY —'}
              </span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {playZoneSlots.map((card, i) => (
                  <DroppableSlot
                    key={`slot-${i}`}
                    id={`slot-${i}`}
                    card={card}
                    onRemove={removeFromPlayZone}
                    committed={committed}
                  />
                ))}
              </div>
            </div>

            {/* Running total */}
            {playZoneCards.length > 0 && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '22px', color: 'var(--color-text)' }}>
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
        playZoneCardIds={playZoneCardIds}
        onAddToZone={addToPlayZone}
        onRemoveFromZone={removeFromPlayZone}
        committed={committed}
        isNegotiating={isNegotiating}
      />
    </div>
    <DragOverlay dropAnimation={null}>
      {draggedCard ? <CardFace card={draggedCard} size="md" style={{ opacity: 0.85, boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }} /> : null}
    </DragOverlay>

    {/* ── INLINE PAIR REVEAL OVERLAY ─────────────────────────────── */}
    <AnimatePresence>
      {myPairDone && !hasSeenMyResult && opponent && (() => {
        const cc = gameState.committed_cards as Record<string, unknown>
        // commit_cards RPC stores cards as a JSON string inside the JSONB column — parse if needed
        function parseCards(val: unknown): Card[] {
          if (!val) return []
          if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
          if (Array.isArray(val)) return val as Card[]
          return []
        }
        const myCards: Card[] = parseCards(cc[myPlayer.user_id])
        const oppCards: Card[] = parseCards(cc[opponent.user_id])
        const myTotal = myCards.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
        const oppTotal = oppCards.filter(c => c.type === 'number').reduce((s, c) => s + c.value, 0)
        const mySpecial = myCards.find(c => c.type !== 'number')
        const oppSpecial = oppCards.find(c => c.type !== 'number')
        // Rough client-side outcome (server resolve-round is authoritative)
        let eventLabel = 'NUMERIC'
        let winnerLabel = myTotal > oppTotal ? 'YOU WIN' : myTotal < oppTotal ? `${opponent.username} WINS` : 'DRAW'
        let winnerColor = myTotal > oppTotal ? 'var(--color-green)' : myTotal < oppTotal ? 'var(--color-red)' : 'var(--color-text-muted)'
        if (mySpecial?.type === 'zombie' && oppSpecial?.type !== 'vaccine') {
          eventLabel = 'ZOMBIE ATTACK'; winnerLabel = 'YOU INFECT'; winnerColor = 'var(--color-green)'
        } else if (oppSpecial?.type === 'zombie' && mySpecial?.type !== 'vaccine') {
          eventLabel = 'ZOMBIE ATTACK'; winnerLabel = 'YOU\'RE INFECTED'; winnerColor = '#ff4444'
        } else if (mySpecial?.type === 'shotgun') {
          eventLabel = 'SHOTGUN'; winnerLabel = myPlayer.status === 'infected' ? 'ELIMINATED' : 'SHOTGUN FIRED'; winnerColor = 'var(--color-warning)'
        } else if (oppSpecial?.type === 'shotgun') {
          eventLabel = 'SHOTGUN'; winnerLabel = 'SHOT AT YOU'; winnerColor = 'var(--color-warning)'
        }
        return (
          <motion.div
            key="pair-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '24px', padding: '24px',
            }}
          >
            {/* Event badge */}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.3em', color: 'var(--color-text-muted)' }}>
              ROUND {gameState.round_number} — {eventLabel}
            </div>

            {/* Players row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px' }}>
              {/* ME */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '120px' }}>
                <img src={myPlayer.avatar_url} alt="You" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--color-red)' }} />
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: 'var(--color-text)' }}>YOU</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {myCards.map(c => <CardFace key={c.id} card={c} size="sm" />)}
                </div>
                {myCards.some(c => c.type === 'number') && (
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-text)' }}>{myTotal}</div>
                )}
              </div>

              {/* VS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingTop: '24px' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '32px', color: 'var(--color-red)' }}>VS</div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '20px', color: winnerColor }}>{winnerLabel}</div>
              </div>

              {/* OPPONENT */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '120px' }}>
                <img src={opponent.avatar_url} alt={opponent.username} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--color-text-muted)' }} />
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: 'var(--color-text)' }}>{opponent.username}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {oppCards.map(c => <CardFace key={c.id} card={c} size="sm" />)}
                </div>
                {oppCards.some(c => c.type === 'number') && (
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', color: 'var(--color-text)' }}>{oppTotal}</div>
                )}
              </div>
            </div>

            {/* Continue button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setHasSeenMyResult(true)}
              style={{
                marginTop: '8px', padding: '10px 40px',
                fontFamily: "'Bebas Neue', cursive", fontSize: '18px', letterSpacing: '0.1em',
                background: 'var(--color-red)', border: 'none', color: '#fff', cursor: 'pointer',
              }}
            >
              CONTINUE →
            </motion.button>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
              Waiting for other duels to finish...
            </div>
          </motion.div>
        )
      })()}
    </AnimatePresence>

    {/* ── WAITING FOR DISCUSSION (after seeing own result) ───────── */}
    <AnimatePresence>
      {hasSeenMyResult && gameState.phase === 'blind_action' && (
        <motion.div
          key="waiting-discussion"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.25em' }}
          >
            WAITING FOR OTHER DUELS...
          </motion.span>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', opacity: 0.5 }}>
            Round {gameState.round_number} — Discussion begins soon
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    </DndContext>
  )
}
