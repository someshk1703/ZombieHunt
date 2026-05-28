import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../context/GameContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../store/gameStore'
import CardFace from './CardFace'
import PlayerStatusBadge from '../PlayerStatusBadge'

interface GhostPlayer {
  id: string
  user_id: string
  username: string
  avatar_url: string
  status: 'alive' | 'infected' | 'eliminated'
  is_bot?: boolean
}

interface GhostData {
  allHands: Record<string, Card[]>
  infectionMap: Record<string, { infectorId: string | null; infectorUsername: string | null }>
  zombieCardHolders: string[]
  committedCards: Record<string, number>
  players: GhostPlayer[]
}

function PlayerNameCard({ player, committedCount }: { player: GhostPlayer | null; committedCount: number }) {
  if (!player) {
    return (
      <div style={{ minHeight: '96px', border: '1px dashed rgba(255,255,255,0.12)', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
          UNKNOWN
        </span>
      </div>
    )
  }

  const isInfected = player.status === 'infected'
  const isEliminated = player.status === 'eliminated'

  return (
    <div style={{
      minHeight: '96px',
      display: 'grid',
      gridTemplateColumns: '44px 1fr',
      gap: '10px',
      alignItems: 'center',
      padding: '12px',
      background: isEliminated ? 'rgba(45,10,10,0.45)' : isInfected ? 'rgba(20,70,34,0.18)' : 'rgba(255,255,255,0.035)',
      border: `1px solid ${isEliminated ? 'rgba(204,0,0,0.45)' : isInfected ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.12)'}`,
      boxShadow: isInfected ? '0 0 18px rgba(74,222,128,0.08)' : 'none',
    }}>
      <img src={player.avatar_url} alt={player.username} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', opacity: isEliminated ? 0.55 : 1 }} />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: '20px',
          color: isInfected ? 'var(--color-green)' : isEliminated ? 'var(--color-text-muted)' : 'var(--color-text)',
          letterSpacing: '0.06em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {player.username}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <PlayerStatusBadge status={player.status} size="sm" />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
            {committedCount > 0 ? `${committedCount} COMMITTED` : 'WAITING'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function GhostOverlay() {
  const { myPlayer, players, room, gameState } = useGame()
  const navigate = useNavigate()
  const [ghostData, setGhostData] = useState<GhostData | null>(null)

  const eliminationRound = (myPlayer as unknown as { elimination_round?: number }).elimination_round
  const playerList = ghostData?.players ?? players
  const playerById = new Map(playerList.map(p => [p.id, p as GhostPlayer]))
  const pairs = (gameState.pairs ?? []).filter(pair => Array.isArray(pair) && pair.length === 2)
  const otherGhosts = playerList.filter(p => p.status === 'eliminated' && p.id !== myPlayer.id)

  useEffect(() => {
    async function fetchGhostData() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghost-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ room_id: room.id })
      })
      if (res.ok) setGhostData(await res.json())
    }

    fetchGhostData()
    const interval = setInterval(fetchGhostData, 5000)
    return () => clearInterval(interval)
  }, [room.id])

  function committedCountFor(player: GhostPlayer | null) {
    if (!player) return 0
    return ghostData?.committedCards[player.user_id] ?? 0
  }

  const activeHands = playerList.filter(p => p.status !== 'eliminated')
  const zombieHolders = ghostData?.zombieCardHolders ?? []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'rgba(4,4,5,0.98)', color: 'var(--color-text)' }}>
      <div style={{
        height: '56px',
        display: 'grid',
        gridTemplateColumns: '180px 1fr 180px',
        alignItems: 'center',
        gap: '12px',
        padding: '0 18px',
        background: '#101012',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-red)', letterSpacing: '0.18em' }}>
          ROUND {gameState.round_number}
        </span>
        <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '22px', color: 'var(--color-text)', letterSpacing: '0.12em', textAlign: 'center' }}>
          ZOMBIE HUNT | MONITOR SCREEN
        </span>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{
            justifySelf: 'end',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.22)',
            color: 'var(--color-text-muted)',
            padding: '8px 10px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} />
          EXIT GAME
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
            ELIMINATED ROUND {eliminationRound ?? '?'} | {otherGhosts.length} OTHER GHOST{otherGhosts.length === 1 ? '' : 'S'} WATCHING
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}>
            READ-ONLY GHOST INTEL | NO ROUND ACTIONS AVAILABLE
          </div>
        </div>

        <section>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '18px', letterSpacing: '0.1em', marginBottom: '10px' }}>
            ALL SIMULTANEOUS DUELS
          </div>
          {pairs.length === 0 ? (
            <div style={{
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.025)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              No active duels yet. Waiting for the next round.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
              {pairs.map(([aId, bId], index) => {
                const playerA = playerById.get(aId) ?? null
                const playerB = playerById.get(bId) ?? null
                return (
                  <div key={`${aId}-${bId}-${index}`} style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.14em' }}>
                      DUEL {index + 1}: {playerA?.username ?? 'Unknown'} vs {playerB?.username ?? 'Unknown'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px 1fr', alignItems: 'center', gap: '10px' }}>
                      <PlayerNameCard player={playerA} committedCount={committedCountFor(playerA)} />
                      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '22px', color: 'var(--color-red)', textAlign: 'center', letterSpacing: '0.08em' }}>
                        VS
                      </div>
                      <PlayerNameCard player={playerB} committedCount={committedCountFor(playerB)} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.6fr)', gap: '12px' }}>
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.025)', padding: '12px' }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.1em', marginBottom: '10px' }}>
              ACTIVE PLAYER HANDS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {activeHands.map(player => {
                const hand = ghostData?.allHands[player.id] ?? []
                return (
                  <div key={player.id} style={{ minHeight: '118px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <img src={player.avatar_url} alt={player.username} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: player.status === 'infected' ? 'var(--color-green)' : 'var(--color-text)' }}>
                        {player.username}
                      </span>
                      <PlayerStatusBadge status={player.status} size="sm" />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', overflow: 'hidden' }}>
                      {hand.map(card => (
                        <CardFace key={card.id} card={card} size="sm" style={{ transform: 'scale(0.58)', transformOrigin: 'top left', margin: '-13px -12px 0 0' }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.025)', padding: '12px' }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.1em', marginBottom: '10px' }}>
              INFECTION INTEL
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {Object.keys(ghostData?.infectionMap ?? {}).length === 0 ? 'No active infections.' : Object.entries(ghostData?.infectionMap ?? {}).map(([infectedId, info]) => {
                const infected = playerById.get(infectedId)
                return `${info.infectorUsername ?? 'Unknown'} -> ${infected?.username ?? 'Unknown'}`
              }).join('\n')}
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '13px', letterSpacing: '0.1em', marginBottom: '8px', color: 'var(--color-green)' }}>
              ZOMBIE CARD HOLDERS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {zombieHolders.length === 0 ? (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>None detected</span>
              ) : zombieHolders.map(id => {
                const player = playerById.get(id)
                return player ? (
                  <span key={id} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-green)' }}>
                    {player.username}
                  </span>
                ) : null
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}