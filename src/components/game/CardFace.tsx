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
  spades: '#d0d0d0',
  hearts: '#e83030',
  diamonds: '#e83030',
  clubs: '#d0d0d0',
}

const SPECIAL_STYLES: Record<string, { border: string; shadow: string; color: string }> = {
  zombie:  { border: 'var(--color-green)',  shadow: 'rgba(0,255,65,0.2)',   color: 'var(--color-green)' },
  shotgun: { border: 'var(--color-warning)', shadow: 'rgba(255,107,0,0.2)', color: 'var(--color-warning)' },
  vaccine: { border: '#4499ff',              shadow: 'rgba(68,153,255,0.2)', color: '#4499ff' },
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
    background: 'linear-gradient(160deg, #242428 0%, #1a1a1d 100%)',
    border: `1.5px solid ${specialStyle ? specialStyle.border : '#505055'}`,
    boxShadow: specialStyle
      ? `0 0 10px ${specialStyle.shadow}, 0 3px 10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.09)`
      : '0 3px 10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.09)',
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
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: dim.valueFont, color: 'var(--color-text)', lineHeight: 1 }}>
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
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: dim.valueFont, color: 'var(--color-text)', lineHeight: 1 }}>
              {valueLabel(card.value)}
            </div>
            <div style={{ fontSize: dim.suitCorner, color: suitColor }}>
              {suitSymbol}
            </div>
          </div>
        </>
      ) : (
        /* Special card layout */
        <>
          {imgError ? (
            /* Fallback: large initial letter */
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            <img
              src={`/assets/cards/${card.type}.png`}
              alt={card.type}
              onError={() => setImgError(true)}
              style={{
                position: 'absolute',
                top: dim.padding, left: dim.padding,
                right: dim.padding,
                bottom: dim.typeFont + 8 + dim.padding,
                width: `calc(100% - ${dim.padding * 2}px)`,
                height: `calc(100% - ${dim.typeFont + 8 + dim.padding * 2}px)`,
                objectFit: 'cover',
              }}
            />
          )}

          {/* Type label at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            fontFamily: "'Bebas Neue', cursive",
            fontSize: dim.typeFont,
            color: specialStyle!.color,
            background: 'rgba(0,0,0,0.7)',
            textAlign: 'center',
            padding: '4px',
            letterSpacing: '0.05em',
          }}>
            {card.type.toUpperCase()}
          </div>
        </>
      )}
    </div>
  )
}
