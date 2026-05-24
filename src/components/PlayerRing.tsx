import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface Player {
  id: string
  user_id: string
  username: string
  avatar_url: string
  is_host: boolean
  is_ready: boolean
  created_at: string
}

interface PlayerRingProps {
  players: Player[]
  maxPlayers: number
  currentUserId: string | undefined
  isHost: boolean
  countdown: number | null
  readyCount: number
  onKick: (player: Player) => void
  onReadyToggle: () => void
  onForceStart: () => void
  onCancelCountdown: () => void
}

function PlayerCard({
  player,
  isSelf,
  isHostViewer,
  onKick,
}: {
  player: Player | null
  isSelf: boolean
  isHostViewer: boolean
  onKick: (p: Player) => void
}) {
  const [kickConfirm, setKickConfirm] = React.useState(false)

  const cardStyle: React.CSSProperties = {
    width: '140px',
    height: '170px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'default',
    position: 'relative',
    flexShrink: 0,
    background: isSelf ? '#220e0e' : '#1C1C22',
    border: `1px solid ${isSelf ? '#4a1a1a' : '#3a3a44'}`,
    ...(isHostViewer && { borderTop: '2px solid #ff6b00' }),
  }

  if (!player) {
    return (
      <div style={{
        width: '140px',
        height: '170px',
        border: '1.5px dashed rgba(58,58,58,0.4)',
        background: 'rgba(20,20,22,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: 'var(--color-text-muted)', opacity: 0.3, fontSize: '24px' }}>+</span>
      </div>
    )
  }

  let badgeStyle: React.CSSProperties = {
    fontSize: '10px',
    padding: '4px 8px',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.05em',
    marginTop: '8px',
    whiteSpace: 'nowrap',
    display: 'block',
    textAlign: 'center',
    width: 'fit-content',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: '112px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  if (isSelf) {
    badgeStyle = { ...badgeStyle, border: '1px solid var(--color-red)', color: 'var(--color-red)' }
  } else if (player.is_ready) {
    badgeStyle = { ...badgeStyle, border: '1px solid var(--color-green)', color: 'var(--color-green)', background: 'rgba(0,255,65,0.1)' }
  } else {
    badgeStyle = { ...badgeStyle, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div
        style={cardStyle}
        className={`player-card${isSelf ? ' player-card--self' : ''}${player.is_host ? ' player-card--host' : ''}`}
      >
        {/* Crown for host */}
        {player.is_host && (
          <span style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '14px' }}>👑</span>
        )}
        {/* Avatar */}
        <img
          src={player.avatar_url}
          alt={player.username}
          style={{ width: '64px', height: '64px', margin: '0 auto 8px auto', border: '2px solid rgba(255,255,255,0.12)', background: '#0a0a0a', flexShrink: 0, display: 'block' }}
        />
        {/* Username */}
        <span className="player-username" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: '#f0f0f0',
          maxWidth: '112px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          marginTop: '6px',
          display: 'block',
        }}>
          {player.username}
        </span>
        {/* Status badge */}
        <span style={badgeStyle}>
          {isSelf ? 'YOU' : player.is_ready ? 'READY' : 'WAITING'}
        </span>
      </div>

      {/* Host kick button — always visible */}
      {isHostViewer && !isSelf && (
        <AnimatePresence mode="wait">
          {!kickConfirm ? (
            <motion.button
              key="kick-btn"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setKickConfirm(true)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '9px',
                color: 'var(--color-red)',
                border: '1px solid var(--color-red)',
                background: 'rgba(255,0,0,0.06)',
                padding: '2px 10px',
                cursor: 'pointer',
                width: '140px',
                marginTop: '10px',
                letterSpacing: '0.05em',
              }}
            >
              ✕ KICK
            </motion.button>
          ) : (
            <motion.div
              key="kick-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '80px' }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                KICK {player.username.slice(0, 8).toUpperCase()}?
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => { onKick(player); setKickConfirm(false) }}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-red)', border: '1px solid var(--color-red)', background: 'rgba(255,0,0,0.1)', padding: '1px 8px', cursor: 'pointer' }}
                >
                  YES
                </button>
                <button
                  onClick={() => setKickConfirm(false)}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', background: 'transparent', padding: '1px 8px', cursor: 'pointer' }}
                >
                  NO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export default function PlayerRing({
  players,
  maxPlayers,
  currentUserId,
  isHost,
  countdown,
  readyCount,
  onKick,
  onReadyToggle,
  onForceStart,
  onCancelCountdown,
}: PlayerRingProps) {
  const slots = useMemo(() => {
    const result: (Player | null)[] = [...players]
    while (result.length < Math.min(maxPlayers, 20)) result.push(null)
    return result
  }, [players, maxPlayers])

  const myPlayer = players.find(p => p.user_id === currentUserId)
  const allReady = readyCount === players.length && players.length >= 3

  const isMobilePortrait = useMediaQuery('(max-width: 767px) and (orientation: portrait)')
  const ringRadius = isMobilePortrait
    ? Math.max(110, Math.min(150, players.length * 18))
    : Math.max(180, players.length * 26)

  const ringSize = isMobilePortrait ? `${ringRadius * 2 + 160}px` : 'clamp(320px, 45vw, 560px)'
  const radius = `${ringRadius}px`
  const centerTitleSize = isMobilePortrait ? '14px' : '20px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      {/* Ring container */}
      <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
        {/* Center info */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', zIndex: 1, pointerEvents: countdown !== null ? 'auto' : 'none',
        }}>
          {countdown !== null ? (
            /* Countdown overlay */
            <div style={{
              position: 'absolute', inset: '-100px',
              background: 'rgba(10,10,10,0.85)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}>
              <motion.span
                key={countdown}
                initial={{ scale: 1.2, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 'clamp(80px, 15vw, 120px)',
                  color: 'var(--color-red)',
                  lineHeight: 1,
                }}
              >
                {countdown}
              </motion.span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                GAME STARTING
              </span>
              {isHost && (
                <button
                  onClick={onCancelCountdown}
                  className="btn-secondary"
                  style={{ marginTop: '16px', fontSize: '12px' }}
                >
                  [ CANCEL ]
                </button>
              )}
            </div>
          ) : (
            <>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: centerTitleSize, color: 'var(--color-red)', letterSpacing: '0.05em' }}>
                ZOMBIE HUNT
              </span>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {readyCount} / {players.length}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                {allReady ? (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-green)' }}>ALL READY</span>
                ) : (
                  <>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--color-text-muted)', display: 'inline-block',
                      animation: 'pulse-dot 1.2s ease-in-out infinite',
                    }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>WAITING...</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Player cards arranged in a circle */}
        {slots.map((player, i) => {
          const angle = (i / slots.length) * 360 - 90
          // Each card is absolutely positioned at center then offset by radius via transform
          return (
            <div
              key={player?.id ?? `empty-${i}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `rotate(${angle}deg) translateX(${radius}) rotate(${-angle}deg) translate(-50%, -50%)`,
              }}
            >
              <PlayerCard
                player={player}
                isSelf={player?.user_id === currentUserId}
                isHostViewer={isHost}
                onKick={onKick}
              />
            </div>
          )
        })}
      </div>

      {/* Ready up / Force start buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {!isHost && myPlayer && (
          <button
            onClick={onReadyToggle}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.1em',
              padding: '10px 24px',
              border: myPlayer.is_ready ? '1px solid var(--color-green)' : '1px solid var(--color-border)',
              background: myPlayer.is_ready ? 'rgba(0,255,65,0.05)' : 'transparent',
              color: myPlayer.is_ready ? 'var(--color-green)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {myPlayer.is_ready ? '✓ READY' : 'MARK AS READY'}
          </button>
        )}
        {isHost && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn-primary"
              onClick={onForceStart}
              disabled={players.length < 3}
              style={{
                fontSize: '13px',
                letterSpacing: '0.1em',
                padding: '10px 28px',
                opacity: players.length < 3 ? 0.4 : 1,
                cursor: players.length < 3 ? 'not-allowed' : 'pointer',
              }}
            >
              ▶ START GAME
            </button>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}>
              {players.length < 3
                ? `Need ${3 - players.length} more player${3 - players.length === 1 ? '' : 's'}`
                : 'Starts immediately — skips ready check'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
