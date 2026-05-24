import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import AtmosphericBackground from '../components/AtmosphericBackground'

interface PlayerRow {
  id: string
  user_id: string
  username: string
  avatar_url: string
  status: 'alive' | 'infected' | 'eliminated'
  is_host: boolean
  is_bot: boolean
  rounds_survived: number
  cards_stolen: number
  infections_caused: number
  special_cards_played: number
  elimination_round: number | null
  elimination_cause: string | null
}

interface GameEvent {
  id: string
  round_number: number
  event_type: string
  actor_username: string | null
  target_username: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface GameStateResult {
  round_number: number
  winner_faction: 'humans' | 'zombies' | null
  winner_player_id: string | null
}

type Tab = 'scoreboard' | 'story'

function formatEvent(ev: GameEvent): string {
  switch (ev.event_type) {
    case 'infection': return `${ev.actor_username} infected ${ev.target_username}`
    case 'elimination': return `${ev.target_username} was eliminated by ${ev.actor_username}`
    case 'vaccine_used': return `${ev.actor_username} used a vaccine`
    case 'shotgun_fired': return `${ev.actor_username} fired a shotgun at ${ev.target_username}`
    case 'card_stolen': return `${ev.actor_username} stole a card from ${ev.target_username}`
    case 'zombie_played': return `${ev.actor_username} played a zombie card`
    case 'game_start': return 'The hunt began'
    case 'game_end': return 'The game ended'
    default: return ev.event_type
  }
}

const dotColors: Record<string, string> = {
  infection: 'var(--color-green)',
  elimination: 'var(--color-red)',
  vaccine_used: '#4499ff',
  shotgun_fired: 'var(--color-warning)',
  zombie_played: '#8000ff',
  game_start: 'var(--color-text-muted)',
  game_end: 'var(--color-text)',
}

function sortPlayers(players: PlayerRow[], winnerPlayerId: string | null): PlayerRow[] {
  return [...players].sort((a, b) => {
    if (a.id === winnerPlayerId) return -1
    if (b.id === winnerPlayerId) return 1
    if (a.status !== 'eliminated' && b.status === 'eliminated') return -1
    if (a.status === 'eliminated' && b.status !== 'eliminated') return 1
    if (a.status !== 'eliminated' && b.status !== 'eliminated') return b.rounds_survived - a.rounds_survived
    return (b.elimination_round ?? 0) - (a.elimination_round ?? 0)
  })
}

export default function Results() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useGameStore()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [gameState, setGameState] = useState<GameStateResult | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [tab, setTab] = useState<Tab>('scoreboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    async function load() {
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code!.toUpperCase()).single()
      if (!room) { navigate('/'); return }

      const [{ data: ps }, { data: gs }, { data: evs }] = await Promise.all([
        supabase.from('players').select('*').eq('room_id', room.id),
        supabase.from('game_state').select('round_number,winner_faction,winner_player_id').eq('room_id', room.id).single(),
        supabase.from('game_events').select('*').eq('room_id', room.id).order('created_at', { ascending: true }),
      ])

      if (ps) setPlayers(ps as PlayerRow[])
      if (gs) setGameState(gs as GameStateResult)
      if (evs) setEvents(evs as GameEvent[])
      setLoading(false)
    }
    load()
  }, [code, navigate])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--color-text-muted)' }}>LOADING RESULTS...</span>
      </div>
    )
  }

  const winnerFaction = gameState?.winner_faction
  const winnerPlayerId = gameState?.winner_player_id ?? null
  const winner = players.find(p => p.id === winnerPlayerId)
  const sorted = sortPlayers(players.filter(p => !p.is_bot), winnerPlayerId)

  const factionColor = winnerFaction === 'humans' ? '#4499ff' : 'var(--color-green)'
  const factionText = winnerFaction === 'humans' ? 'HUMANITY PREVAILS' : 'THE DEAD WALK'
  const factionBg = winnerFaction === 'humans' ? 'rgba(0,0,40,0.8)' : 'rgba(0,20,0,0.8)'

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AtmosphericBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ border: `2px solid ${factionColor}`, background: factionBg, padding: '24px', marginBottom: '8px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '48px', color: factionColor, letterSpacing: '0.05em' }}>{factionText}</div>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '32px' }}>
          GAME COMPLETED — {gameState?.round_number ?? 0} ROUNDS
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
          {(['scoreboard', 'story'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.1em',
              color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)',
              borderBottom: tab === t ? '2px solid var(--color-red)' : '2px solid transparent',
              transition: 'border-bottom 150ms',
            }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* SCOREBOARD TAB */}
        {tab === 'scoreboard' && (
          <div>
            {/* Winner row */}
            {winner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', marginBottom: '24px',
                background: `linear-gradient(135deg, ${factionBg}, transparent)`,
                border: `1px solid ${factionColor}`,
              }}>
                <img src={winner.avatar_url} alt={winner.username} style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${factionColor}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '24px', color: 'var(--color-text)' }}>{winner.username}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', padding: '2px 6px', border: `1px solid ${factionColor}`, color: factionColor }}>WINNER</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {winner.rounds_survived} rounds · {winner.cards_stolen} stolen · {winner.infections_caused} infected
                  </div>
                </div>
              </div>
            )}

            {/* Table headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 60px 60px 60px', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
              {['#', 'PLAYER', 'STATUS', 'ROUNDS', 'STOLEN', 'INFECTED', 'SPECIALS'].map(h => (
                <span key={h} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>{h}</span>
              ))}
            </div>

            {sorted.map((p, i) => {
              const isMe = p.user_id === user?.id
              const isWinner = p.id === winnerPlayerId
              return (
                <div key={p.id}
                  style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 60px 60px 60px', gap: '8px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: isMe ? '2px solid var(--color-red)' : '2px solid transparent', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '20px', color: 'var(--color-text-muted)' }}>{i + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={p.avatar_url} alt={p.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text)' }}>{p.username}</span>
                  </div>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '2px 6px',
                    border: `1px solid ${isWinner ? factionColor : p.status === 'eliminated' ? 'var(--color-text-muted)' : 'var(--color-green)'}`,
                    color: isWinner ? factionColor : p.status === 'eliminated' ? 'var(--color-text-muted)' : 'var(--color-green)',
                  }}>
                    {isWinner ? 'WINNER' : p.status.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)' }}>{p.rounds_survived}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)' }}>{p.cards_stolen}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: p.infections_caused > 0 ? 'var(--color-green)' : 'var(--color-text-muted)' }}>{p.infections_caused}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: p.special_cards_played > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{p.special_cards_played}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* GAME STORY TAB */}
        {tab === 'story' && (
          <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '1px solid var(--color-border)' }}>
            {events.length === 0 ? (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '24px 0' }}>No events recorded.</div>
            ) : (
              events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}
                >
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: '-28px', top: '4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: dotColors[ev.event_type] ?? 'var(--color-text-muted)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 6px' }}>
                      R{ev.round_number}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)' }}>
                      {formatEvent(ev)}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)' }}>
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Bottom actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '48px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px', fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.05em',
              background: 'var(--color-red)', border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            PLAY AGAIN
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px', fontFamily: "'Bebas Neue', cursive", fontSize: '16px', letterSpacing: '0.05em',
              background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer',
            }}
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  )
}
