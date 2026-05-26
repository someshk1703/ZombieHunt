import { useDraggable } from '@dnd-kit/core'
import { useGame } from '../../context/GameContext'
import { Card } from '../../store/gameStore'
import CardFace from './CardFace'

interface HandPanelProps {
  playZoneCardIds: Set<string>
  onAddToZone: (card: Card) => void
  onRemoveFromZone: (card: Card) => void
  committed: boolean
  isNegotiating: boolean
}

function DraggableCard({
  card,
  inZone,
  disabled,
  onClick,
}: {
  card: Card
  inZone: boolean
  disabled: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-${card.id}`,
    data: { card },
    disabled,
  })

  const style: React.CSSProperties = {
    position: 'relative',
    cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
    opacity: inZone ? 0.35 : isDragging ? 0.5 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: isDragging ? 'none' : 'opacity 200ms, transform 200ms',
    flexShrink: 0,
    zIndex: isDragging ? 999 : 'auto',
    touchAction: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={!isDragging ? onClick : undefined}>
      <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}>
        <CardFace card={card} size="md" />
      </div>
      {inZone && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--color-text)' }}>IN PLAY</span>
        </div>
      )}
    </div>
  )
}

export default function HandPanel({ playZoneCardIds, onAddToZone, onRemoveFromZone, committed, isNegotiating }: HandPanelProps) {
  const { myHand } = useGame()

  function handleCardClick(card: Card) {
    if (committed || isNegotiating || card.used) return
    if (playZoneCardIds.has(card.id)) {
      onRemoveFromZone(card)
    } else {
      onAddToZone(card)
    }
  }

  const availableCards = myHand.filter(c => !c.used)
  const usedCards = myHand.filter(c => c.used)

  return (
    <div style={{
      background: 'linear-gradient(180deg, #141416 0%, #0f0f11 100%)',
      borderTop: '1px solid #383838',
      display: 'flex', flexDirection: 'column',
      padding: '10px 16px 12px', flexShrink: 0,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
          YOUR HAND — {myHand.length} cards · drag or tap to play
        </span>
        {isNegotiating && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>
            Cards locked during negotiation
          </span>
        )}
      </div>
      <div style={{
        display: 'flex', gap: '10px', flex: 1,
        alignItems: 'center', justifyContent: 'center',
        flexWrap: 'wrap', paddingBottom: '4px',
      }}>
        {availableCards.map(card => (
          <DraggableCard
            key={card.id}
            card={card}
            inZone={playZoneCardIds.has(card.id)}
            disabled={committed || isNegotiating}
            onClick={() => handleCardClick(card)}
          />
        ))}
        {usedCards.map(card => (
          <div key={card.id} style={{ position: 'relative', flexShrink: 0, opacity: 0.3, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))' }}>
            <CardFace card={card} size="md" />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
            }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--color-text-muted)' }}>USED</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

