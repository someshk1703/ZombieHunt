import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy } from 'lucide-react'

interface RoomSettings {
  room_name?: string
  max_players: number
  round_timer_seconds: number
  allow_spectators: boolean
  infection_visibility: boolean
  visibility: string
}

interface RoomInfoProps {
  roomCode: string
  settings: RoomSettings
  playerCount: number
  hostUsername: string
}

function cardDistribution(players: number) {
  const zombieCount = Math.floor(players / 5)
  const vaccineCount = Math.floor(players / 4)
  const shotgunCount = players - zombieCount
  return { zombieCount, vaccineCount, shotgunCount }
}

export default function RoomInfo({ roomCode, settings, playerCount, hostUsername }: RoomInfoProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const shareUrl = `${window.location.origin}/room/${roomCode}`
  const dist = cardDistribution(playerCount)

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 80,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#e8e8e8' },
    }).then(setQrDataUrl).catch(() => {})
  }, [shareUrl])

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const divider = <div style={{ height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />

  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--color-border)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text)' }}>{value}</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '24px' }}>
      {/* Player count meter */}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
        SURVIVORS
      </p>
      <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: 'var(--color-text)', lineHeight: 1 }}>
        {playerCount}
      </p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
        / {settings.max_players} MAX
      </p>
      <div style={{ height: '4px', background: 'var(--color-border)', width: '100%' }}>
        <div style={{
          height: '100%',
          background: 'var(--color-red)',
          width: `${Math.min((playerCount / settings.max_players) * 100, 100)}%`,
          transition: 'width 300ms ease',
        }} />
      </div>

      {divider}

      {/* Settings summary */}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
        ROOM SETTINGS
      </p>
      <Row label="Timer" value={`${settings.round_timer_seconds}s`} />
      <Row label="Ghost Mode" value={settings.allow_spectators ? 'On' : 'Off'} />
      <Row label="Infection" value={settings.infection_visibility ? 'Auto-reveal' : 'Secret'} />
      <Row label="Visibility" value={settings.visibility === 'public' ? 'Public' : 'Private'} />
      <Row label="Host" value={hostUsername} />

      {divider}

      {/* Card distribution */}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
        CARD DISTRIBUTION
      </p>
      {([
        ['🧟', 'ZOMBIE CARDS', dist.zombieCount, 'var(--color-red)'],
        ['💉', 'VACCINE CARDS', dist.vaccineCount, 'var(--color-green)'],
        ['🔫', 'SHOTGUN CARDS', dist.shotgunCount, 'var(--color-warning)'],
      ] as [string, string, number, string][]).map(([icon, label, count, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <span>{icon}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', flex: 1 }}>{label}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color }}>{count}</span>
        </div>
      ))}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
        Based on {playerCount} players
      </p>

      {divider}

      {/* Invite section */}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
        INVITE SURVIVORS
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span
          title={shareUrl}
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            color: 'var(--color-text-muted)', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {shareUrl}
        </span>
        <button
          onClick={copyLink}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-green)' : 'var(--color-text-muted)', flexShrink: 0 }}
        >
          {copied ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px' }}>COPIED!</span> : <Copy size={12} />}
        </button>
      </div>
      {qrDataUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <img
            src={qrDataUrl}
            alt="QR code"
            style={{ width: '80px', height: '80px', border: '1px solid var(--color-border)', imageRendering: 'pixelated' }}
          />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>
            Scan to join
          </span>
        </div>
      )}
    </div>
  )
}
