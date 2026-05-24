interface CardBackProps {
  width?: number
  height?: number
  style?: React.CSSProperties
  className?: string
}

export default function CardBack({ width = 88, height = 120, style, className }: CardBackProps) {
  return (
    <div
      className={className}
      style={{
        width, height,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Diagonal crosshatch pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'repeating-linear-gradient(45deg, var(--color-border) 0, var(--color-border) 0.5px, transparent 0, transparent 50%)',
        backgroundSize: '8px 8px',
        opacity: 0.05,
        pointerEvents: 'none',
      }} />
      {/* ZH monogram */}
      <span style={{
        fontFamily: "'Bebas Neue', cursive",
        fontSize: '24px',
        color: 'var(--color-red)',
        letterSpacing: '0.05em',
        position: 'relative',
        zIndex: 1,
        userSelect: 'none',
      }}>
        ZH
      </span>
    </div>
  )
}
