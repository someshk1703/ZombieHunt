import { useState } from 'react'
import { Card } from '../../store/gameStore'

type CardSize = 'sm' | 'md' | 'lg'

const SIZE_MAP = {
  sm:  { width: 64,  height: 88,  valueFont: 14, suitCorner: 10, suitCenter: 20, typeFont: 10, padding: 4 },
  md:  { width: 88,  height: 120, valueFont: 18, suitCorner: 12, suitCenter: 28, typeFont: 13, padding: 6 },
  lg:  { width: 120, height: 160, valueFont: 24, suitCorner: 16, suitCenter: 40, typeFont: 16, padding: 8 },
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
}

const SUIT_COLORS: Record<string, string> = {
  spades: 'var(--card-text)',
  hearts: 'var(--card-red)',
  diamonds: 'var(--card-red)',
  clubs: 'var(--card-text)',
}

const SPECIAL_STYLES: Record<string, { border: string; shadow: string; color: string }> = {
  zombie:  { border: 'rgba(0,255,65,0.5)',    shadow: 'rgba(0,255,65,0.25)',    color: 'var(--color-green)' },
  shotgun: { border: 'rgba(255,107,0,0.5)',   shadow: 'rgba(255,107,0,0.25)',   color: 'var(--color-warning)' },
  vaccine: { border: 'rgba(68,153,255,0.5)',  shadow: 'rgba(68,153,255,0.25)', color: '#4499ff' },
}

function valueLabel(value: number): string {
  if (value === 14) return 'A'
  if (value === 13) return 'K'
  if (value === 12) return 'Q'
  if (value === 11) return 'J'
  return String(value)
}

interface CardFaceProps {
  card: Card
  size?: CardSize
  style?: React.CSSProperties
}

export default function CardFace({ card, size = 'md', style }: CardFaceProps) {
  const dim = SIZE_MAP[size]
  const [imgError, setImgError] = useState(false)

  const isSpecial = card.type !== 'number'
  const specialStyle = isSpecial ? SPECIAL_STYLES[card.type] : null
  const suitColor = card.suit ? SUIT_COLORS[card.suit] : 'var(--color-text)'
  const suitSymbol = card.suit ? SUIT_SYMBOLS[card.suit] : ''

  const cardStyle: React.CSSProperties = {
    width: dim.width,
    height: dim.height,
    background: 'var(--card-bg)',
    border: `1px solid ${specialStyle ? specialStyle.border : 'var(--card-border)'}`,
    boxShadow: specialStyle
      ? `0 0 20px ${specialStyle.shadow}, 0 6px 20px var(--card-shadow), 0 2px 0 rgba(0,0,0,0.15)`
      : `0 2px 0 rgba(0,0,0,0.15), 0 6px 20px var(--card-shadow)`,
    position: 'relative',
    overflow: 'hidden',
    padding: dim.padding,
    display: 'flex',
    flexShrink: 0,
    ...style,
  }

  return (
    <div style={cardStyle}>
      {/* Used overlay */}
      {card.used && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
            USED
          </span>
        </div>
      )}

      {!isSpecial ? (
        /* Number card layout */
        <>
          {/* Top-left corner */}
          <div style={{ position: 'absolute', top: dim.padding, left: dim.padding, lineHeight: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: dim.valueFont, color: suitColor, lineHeight: 1 }}>
              {valueLabel(card.value)}
            </div>
            <div style={{ fontSize: dim.suitCorner, color: suitColor }}>
              {suitSymbol}
            </div>
          </div>

          {/* Center suit */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: dim.suitCenter, color: suitColor,
          }}>
            {suitSymbol}
          </div>

          {/* Bottom-right corner (rotated) */}
          <div style={{
            position: 'absolute', bottom: dim.padding, right: dim.padding,
            transform: 'rotate(180deg)', lineHeight: 1,
          }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: dim.valueFont, color: suitColor, lineHeight: 1 }}>
              {valueLabel(card.value)}
            </div>
            <div style={{ fontSize: dim.suitCorner, color: suitColor }}>
              {suitSymbol}
            </div>
          </div>
          {/* Inner frame */}
          <div style={{ position: 'absolute', inset: '3px', border: '0.5px solid var(--card-border-inner)', pointerEvents: 'none' }} />
        </>
      ) : (
        /* Special card layout */
        <>
          {imgError ? (
            /* Fallback: large initial letter */
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#0a0a0a',
            }}>
              <span style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: dim.suitCenter,
                color: specialStyle!.color,
              }}>
                {card.type[0].toUpperCase()}
              </span>
            </div>
          ) : (
            <>
              {/* Dark art background */}
              <div style={{
                position: 'absolute', inset: '6px',
                background: '#0a0a0a', overflow: 'hidden',
              }}>
                <img
                  src={`/assets/cards/${card.type}.png`}
                  alt={card.type}
                  draggable={false}
                  onDragStart={e => e.preventDefault()}
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: `calc(100% - ${dim.typeFont + 4}px)`,
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </>
          )}

          {/* Type label at bottom */}
          <div style={{
            position: 'absolute', bottom: 6, left: 6, right: 6,
            fontFamily: "'Bebas Neue', cursive",
            fontSize: dim.typeFont,
            color: specialStyle!.color,
            background: 'rgba(0,0,0,0.9)',
            textAlign: 'center',
            padding: '4px 0',
            letterSpacing: '0.05em',
          }}>
            {card.type.toUpperCase()}
          </div>
        </>
      )}
    </div>
  )
}
