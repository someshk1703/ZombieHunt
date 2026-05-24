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
      height: '160px', background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column',
      padding: '8px 16px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
          {myHand.length} cards in hand
        </span>
        {isNegotiating && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>
            Cards locked during negotiation
          </span>
        )}
      </div>
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', flex: 1,
        alignItems: 'center', paddingBottom: '4px',
      }}>
        {availableCards.map(card => {
          const inZone = playZoneCardIds.has(card.id)
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                position: 'relative', cursor: committed || isNegotiating ? 'default' : 'pointer',
                opacity: inZone ? 0.4 : 1,
                transform: inZone ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 200ms',
                flexShrink: 0,
              }}
            >
              <CardFace card={card} size="sm" />
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
        })}
        {usedCards.map(card => (
          <div key={card.id} style={{ position: 'relative', flexShrink: 0, opacity: 0.3 }}>
            <CardFace card={card} size="sm" />
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
