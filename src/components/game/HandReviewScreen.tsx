import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../store/gameStore'
import CardFace from './CardFace'
import CardBack from './CardBack'

const VALUE_NAMES: Record<number, string> = {
  14: 'ACE', 13: 'KING', 12: 'QUEEN', 11: 'JACK',
}

function cardLabel(card: Card): string {
  if (card.type !== 'number') return 'SPECIAL'
  const val = VALUE_NAMES[card.value] ?? String(card.value)
  return `${val} OF ${card.suit?.toUpperCase() ?? ''}`
}

function generatePairs(players: { id: string; status: string; is_bot?: boolean }[]) {
  const SUBJECT_ZERO_UUID_PREFIX = '00000000'
  const sz = players.find(p => p.is_bot)
  const humanAlive = players.filter(p =>
    !p.is_bot && (p.status === 'alive' || p.status === 'infected')
  )
  const shuffled = [...humanAlive].sort(() => Math.random() - 0.5)
  const pairs: string[][] = []
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i].id, shuffled[i + 1].id])
  }
  // Pair odd-one-out with Subject Zero bot
  if (shuffled.length % 2 !== 0 && sz) {
    pairs.push([shuffled[shuffled.length - 1].id, sz.id])
  }
  const bye = shuffled.length % 2 !== 0 && !sz ? shuffled[shuffled.length - 1].id : null
  void SUBJECT_ZERO_UUID_PREFIX // suppress unused warning
  return { pairs, bye }
}

interface SortableCardProps {
  card: Card
}

function SortableCard({ card }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <motion.div
        whileHover={{ y: -16 }}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        {...attributes}
        {...listeners}
      >
        <CardFace card={card} size="md" />
      </motion.div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        {cardLabel(card)}
      </span>
    </div>
  )
}

export default function HandReviewScreen() {
  const { myHand, setMyHand, gameState, isHost, players, myPlayer, room } = useGame()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(15)
  const [transitioning, setTransitioning] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Countdown from phase_deadline
  useEffect(() => {
    if (!gameState.phase_deadline) return

    function tick() {
      const remaining = Math.max(0, Math.floor((new Date(gameState.phase_deadline!).getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0 && !transitioning) handlePhaseEnd()
    }

    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [gameState.phase_deadline])

  const handlePhaseEnd = useCallback(async () => {
    if (transitioning) return
    setTransitioning(true)

    // Save hand order to Supabase
    await supabase
      .from('players')
      .update({ hand: myHand })
      .eq('id', myPlayer.id)

    // Host transitions phase
    if (isHost) {
      const { pairs, bye } = generatePairs(players)
      const roundTimer = room.settings.round_timer_seconds
      const deadline = new Date(Date.now() + roundTimer * 1000).toISOString()
      await supabase.from('game_state').update({
        phase: 'blind_action',
        pairs,
        bye_player_id: bye,
        phase_deadline: deadline,
        round_number: gameState.round_number,
      }).eq('id', gameState.id)
    }
  }, [myHand, myPlayer.id, isHost, players, gameState, room, transitioning])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIndex = myHand.findIndex(c => c.id === active.id)
    const newIndex = myHand.findIndex(c => c.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      setMyHand(arrayMove(myHand, oldIndex, newIndex))
    }
  }

  const activeCard = activeId ? myHand.find(c => c.id === activeId) : null
  const progressPct = gameState.phase_deadline
    ? Math.max(0, (new Date(gameState.phase_deadline).getTime() - Date.now()) / 15000) * 100
    : 0

  const otherPlayers = players.filter(p => p.user_id !== myPlayer.user_id)

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)',
    }}>
      {/* TOP (20%) */}
      <div style={{ flex: '0 0 20%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '24px 24px 16px' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '36px', color: 'var(--color-text)', letterSpacing: '0.05em', textAlign: 'center' }}>
          REVIEW YOUR HAND
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '4px' }}>
          Arrange your cards. The hunt begins soon.
        </p>

        {/* Countdown bar */}
        <div style={{ width: '100%', maxWidth: '600px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <motion.span
              animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.6 }}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '13px',
                color: timeLeft <= 5 ? 'var(--color-warning)' : 'var(--color-text)',
              }}
            >
              {timeLeft}s
            </motion.span>
          </div>
          <div style={{ height: '3px', background: 'var(--color-border)', width: '100%' }}>
            <div style={{
              height: '100%', background: 'var(--color-red)',
              width: `${progressPct}%`, transition: 'width 0.5s linear',
            }} />
          </div>
        </div>
      </div>

      {/* MIDDLE (55%) */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={myHand.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'flex-end',
              overflowX: 'auto', paddingBottom: '8px',
              maxWidth: '100%',
            }}>
              {myHand.map(card => (
                <SortableCard key={card.id} card={card} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard && <CardBack width={88} height={120} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* BOTTOM (25%) */}
      <div style={{
        flex: '0 0 25%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '16px 24px 24px', gap: '12px',
      }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
          OTHER SURVIVORS
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {otherPlayers.map(p => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <img src={p.avatar_url} alt={p.username} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-bg)' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text)' }}>
                {p.username.slice(0, 10)}
              </span>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}
              >
                REVIEWING...
              </motion.span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '8px' }}>
          Your hand is set. Waiting for the game to begin.
        </p>
      </div>
    </div>
  )
}
