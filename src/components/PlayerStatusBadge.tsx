type PlayerStatus = 'alive' | 'infected' | 'eliminated' | 'ghost'

interface PlayerStatusBadgeProps {
  status: PlayerStatus
  size?: 'sm' | 'md'
}

const configs: Record<PlayerStatus, { label: string; color: string }> = {
  alive:      { label: 'ALIVE',      color: 'var(--color-text-muted)' },
  infected:   { label: 'INFECTED',   color: 'var(--color-green)' },
  eliminated: { label: 'ELIMINATED', color: 'var(--color-red)' },
  ghost:      { label: 'GHOST',      color: 'rgba(180,180,255,0.5)' },
}

export default function PlayerStatusBadge({ status, size = 'sm' }: PlayerStatusBadgeProps) {
  const { label, color } = configs[status]
  const fontSize = size === 'sm' ? '9px' : '11px'
  const padding = size === 'sm' ? '1px 6px' : '2px 8px'

  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize,
      border: `1px solid ${color}`, color,
      padding, letterSpacing: '0.1em', display: 'inline-block',
    }}>
      {label}
    </span>
  )
}
