import { useNavigate } from 'react-router-dom'

export default function BackButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-text-muted)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        textTransform: 'uppercase',
        padding: '0',
        transition: 'color 150ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
    >
      ← BACK
    </button>
  )
}
