import { useVoiceChat } from '../hooks/useVoiceChat'

interface Props {
  roomId: string
  userId: string
}

export default function VoiceChat({ roomId, userId }: Props) {
  const { active, muted, peers, join, leave, toggleMute } = useVoiceChat(roomId, userId)

  const peerList = Object.values(peers)

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '12px',
      zIndex: 120,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Peer indicators */}
      {active && peerList.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'flex-end',
        }}>
          {peerList.map(p => (
            <div key={p.userId} style={{
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--color-zombie, #4ade80)',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              textTransform: 'uppercase',
            }}>
              🎙 CONNECTED
            </div>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {active && (
          <>
            {/* Mute / unmute */}
            <button
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
              style={{
                background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
                border: `1px solid ${muted ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.4)'}`,
                borderRadius: '6px',
                color: muted ? '#ef4444' : '#4ade80',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: '6px 10px',
              }}
            >
              {muted ? '🔇' : '🎙️'}
            </button>

            {/* Leave voice */}
            <button
              onClick={leave}
              title="Leave voice chat"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '6px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '11px',
                letterSpacing: '0.08em',
                padding: '6px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                textTransform: 'uppercase',
              }}
            >
              LEAVE
            </button>
          </>
        )}

        {/* Join voice */}
        {!active && (
          <button
            onClick={join}
            title="Join voice chat"
            style={{
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.35)',
              borderRadius: '6px',
              color: 'rgba(74,222,128,0.8)',
              cursor: 'pointer',
              fontSize: '11px',
              letterSpacing: '0.1em',
              padding: '6px 12px',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
            }}
          >
            🎙️ VOICE
          </button>
        )}
      </div>
    </div>
  )
}
