import { useState } from 'react'
import { audioManager } from '../lib/audio'

export default function AudioControls() {
  const [expanded, setExpanded] = useState(false)
  const [muted, setMuted] = useState(() => audioManager.isMuted())
  const [volumes, setVolumes] = useState(() => audioManager.getVolumes())

  function toggleMute() {
    const next = !muted
    setMuted(next)
    audioManager.setMuted(next)
  }

  function handleVolume(category: Parameters<typeof audioManager.setVolume>[0], value: number) {
    audioManager.setVolume(category, value)
    setVolumes(audioManager.getVolumes())
  }

  return (
    <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      {expanded && (
        <div style={{
          width: '180px', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '14px', color: 'var(--color-text)' }}>AUDIO</div>
          {(['master', 'ui', 'game', 'music'] as const).map(cat => (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                {cat.toUpperCase()}
              </span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={volumes[cat]}
                onChange={e => handleVolume(cat, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-red)', height: '4px' }}
              />
            </div>
          ))}
          <button onClick={toggleMute} style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            background: muted ? 'rgba(204,0,0,0.2)' : 'var(--color-surface)',
            border: `1px solid ${muted ? 'var(--color-red)' : 'var(--color-border)'}`,
            color: muted ? 'var(--color-red)' : 'var(--color-text-muted)',
            padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.1em',
          }}>
            {muted ? 'UNMUTE ALL' : 'MUTE ALL'}
          </button>
        </div>
      )}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '36px', height: '36px', background: 'rgba(10,10,10,0.8)',
          border: '1px solid var(--color-border)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}
        title="Audio settings"
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
