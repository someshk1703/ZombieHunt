import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [hovered, setHovered] = React.useState(false)

  const cardStyle: React.CSSProperties = {
    width: '80px',
    height: '96px',
    background: 'var(--color-surface)',
    border: `1px solid ${isSelf ? 'var(--color-red)' : 'var(--color-border)'}`,
    boxShadow: isSelf ? '0 0 8px var(--color-red-glow)' : 'none',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'default',
    position: 'relative',
    flexShrink: 0,
  }

  if (!player) {
    return (
      <div style={{
        ...cardStyle,
        border: '1px dashed rgba(42,42,42,0.3)',
        background: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: 'var(--color-text-muted)', opacity: 0.3, fontSize: '20px' }}>+</span>
      </div>
    )
  }

  let badgeStyle: React.CSSProperties = {
    fontSize: '8px',
    padding: '2px 6px',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.05em',
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setKickConfirm(false) }}
      >
        {/* Crown for host */}
        {player.is_host && (
          <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '10px' }}>👑</span>
        )}
        {/* Avatar */}
        <img
          src={player.avatar_url}
          alt={player.username}
          style={{ width: '44px', height: '44px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
        />
        {/* Username */}
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '9px',
          color: 'var(--color-text)',
          maxWidth: '68px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {player.username.slice(0, 10)}
        </span>
        {/* Status badge */}
        <span style={badgeStyle}>
          {isSelf ? 'YOU' : player.is_ready ? 'READY' : 'WAITING'}
        </span>
      </div>

      {/* Host kick button */}
      {isHostViewer && !isSelf && (
        <AnimatePresence>
          {hovered && !kickConfirm && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={() => setKickConfirm(true)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '9px',
                color: 'var(--color-red)',
                border: '1px solid var(--color-red)',
                background: 'transparent',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              KICK
            </motion.button>
          )}
          {hovered && kickConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '80px' }}>
                KICK {player.username.slice(0, 8).toUpperCase()}?
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => { onKick(player); setKickConfirm(false); setHovered(false) }}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-red)', border: '1px solid var(--color-red)', background: 'transparent', padding: '1px 6px', cursor: 'pointer' }}
                >
                  YES
                </button>
                <button
                  onClick={() => setKickConfirm(false)}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', background: 'transparent', padding: '1px 6px', cursor: 'pointer' }}
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

  const ringSize = 'clamp(320px, 45vw, 560px)'
  const radius = 'clamp(130px, 18vw, 230px)'

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
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '20px', color: 'var(--color-red)', letterSpacing: '0.05em' }}>
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
        {isHost && players.length >= 3 && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn-secondary"
              onClick={onForceStart}
              style={{ fontSize: '12px', letterSpacing: '0.08em' }}
            >
              ⚡ FORCE START
            </button>
            <span style={{
              position: 'absolute', bottom: '-20px', left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px', color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              Start without waiting for all to ready up
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
