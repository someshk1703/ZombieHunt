interface CardBackProps {
  width?: number
  height?: number
  style?: React.CSSProperties
  className?: string
  subjectZero?: boolean
}

export default function CardBack({ width = 88, height = 120, style, className, subjectZero = false }: CardBackProps) {
  const isDark = subjectZero

  return (
    <div
      className={className}
      style={{
        width, height,
        background: isDark
          ? 'linear-gradient(135deg, #0a150a, #0d1a0d)'
          : 'var(--card-bg)',
        border: isDark
          ? '1px solid rgba(0,255,65,0.4)'
          : '1px solid var(--card-border)',
        boxShadow: isDark
          ? '0 6px 20px rgba(0,0,0,0.8)'
          : `inset 0 0 0 5px rgba(200,200,200,0.3), inset 0 0 0 6px rgba(0,0,0,0.06), 0 6px 20px var(--card-shadow)`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Corner dots (non-dark only) */}
      {!isDark && (
        <>
          <div style={{ position: 'absolute', top: 6, left: 6, width: 3, height: 3, background: 'rgba(0,0,0,0.15)' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 3, height: 3, background: 'rgba(0,0,0,0.15)' }} />
        </>
      )}
      {/* Crosshatch pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: isDark
          ? `repeating-linear-gradient(45deg, transparent, transparent 7px, rgba(0,255,65,0.04) 7px, rgba(0,255,65,0.04) 8px)`
          : `repeating-linear-gradient(45deg, transparent, transparent 7px, rgba(0,0,0,0.07) 7px, rgba(0,0,0,0.07) 8px),
             repeating-linear-gradient(-45deg, transparent, transparent 7px, rgba(0,0,0,0.04) 7px, rgba(0,0,0,0.04) 8px)`,
        pointerEvents: 'none',
      }} />
      {/* ZH monogram */}
      <span style={{
        fontFamily: "'Bebas Neue', cursive",
        fontSize: '22px',
        color: isDark ? 'var(--color-green)' : 'var(--card-red)',
        letterSpacing: '0.05em',
        position: 'relative',
        zIndex: 1,
        userSelect: 'none',
        border: isDark ? '1px solid rgba(0,255,65,0.3)' : '1px solid rgba(153,0,0,0.3)',
        padding: '4px 10px',
      }}>
        ZH
      </span>
    </div>
  )
}
