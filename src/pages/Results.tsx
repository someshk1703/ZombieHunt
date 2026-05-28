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
  elimination_round: number | null
  elimination_cause: string | null
  rounds_survived: number
  infections_caused: number
  special_cards_played: number
  cards_stolen: number
}

interface RoundOutcome {
  playerA_id: string
  playerB_id: string
  winner_id: string | null
  loser_id?: string | null
  event: 'numeric' | 'infection' | 'elimination' | 'draw' | 'vaccine'
  infector_id?: string
  infected_id?: string
  cured_id?: string
  eliminated_id?: string
}

interface GameEvent {
  id: string
  room_id: string
  round_number: number
  event_type: 'infection' | 'elimination' | 'vaccine_used' | 'card_stolen' | 'game_end'
  actor_id: string | null
  target_id: string | null
  actor_username: string | null
  target_username: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface RoundLogEntry {
  round_number: number
  outcomes: RoundOutcome[]
}

interface PlayerStats {
  rounds_survived: number
  infections_caused: number
  special_cards_played: number
}

interface GameStateResult {
  round_number: number
  winner_faction: 'humans' | 'zombies' | null
  winner_player_id: string | null
}

type Tab = 'scoreboard' | 'story'

function sortPlayers(players: PlayerRow[], winnerPlayerId: string | null, stats: Record<string, PlayerStats>): PlayerRow[] {
  return [...players].sort((a, b) => {
    if (a.id === winnerPlayerId) return -1
    if (b.id === winnerPlayerId) return 1
    if (a.status !== 'eliminated' && b.status === 'eliminated') return -1
    if (a.status === 'eliminated' && b.status !== 'eliminated') return 1
    if (a.status !== 'eliminated' && b.status !== 'eliminated') return (stats[b.id]?.rounds_survived ?? 0) - (stats[a.id]?.rounds_survived ?? 0)
    return (b.elimination_round ?? 0) - (a.elimination_round ?? 0)
  })
}

function computeStats(roundLogs: RoundLogEntry[]): Record<string, PlayerStats> {
  const map: Record<string, PlayerStats> = {}
  const ensure = (id: string) => { if (!map[id]) map[id] = { rounds_survived: 0, infections_caused: 0, special_cards_played: 0 } }

  for (const log of roundLogs) {
    for (const o of log.outcomes) {
      ensure(o.playerA_id)
      ensure(o.playerB_id)
      // Both participants survived this round (even losers who weren't eliminated)
      if (o.event !== 'elimination') {
        map[o.playerA_id].rounds_survived++
        map[o.playerB_id].rounds_survived++
      } else {
        // Only the winner survived; eliminated player did not
        if (o.winner_id) {
          ensure(o.winner_id)
          map[o.winner_id].rounds_survived++
        }
      }
      // Infections caused
      if (o.event === 'infection' && o.infector_id) {
        ensure(o.infector_id)
        map[o.infector_id].infections_caused++
      }
      // Special cards played: any non-numeric event means at least one special card was used
      if (o.event === 'infection' || o.event === 'elimination') {
        map[o.playerA_id].special_cards_played++
        map[o.playerB_id].special_cards_played++
      }
    }
  }
  return map
}

export default function Results() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useGameStore()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [gameState, setGameState] = useState<GameStateResult | null>(null)
  const [roundLogs, setRoundLogs] = useState<RoundLogEntry[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [stats, setStats] = useState<Record<string, PlayerStats>>({})
  const [tab, setTab] = useState<Tab>('scoreboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    async function load() {
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code!.toUpperCase()).single()
      if (!room) { navigate('/'); return }

      const [{ data: ps }, { data: gs }, { data: logs }, { data: evts }] = await Promise.all([
        supabase.from('players')
          .select('id, user_id, username, avatar_url, status, is_host, is_bot, elimination_round, elimination_cause, rounds_survived, infections_caused, special_cards_played, cards_stolen')
          .eq('room_id', room.id)
          .order('rounds_survived', { ascending: false }),
        supabase.from('game_state').select('round_number,winner_faction,winner_player_id').eq('room_id', room.id).single(),
        supabase.from('round_log').select('round_number,outcomes').eq('room_id', room.id).order('round_number', { ascending: true }),
        supabase.from('game_events').select('*').eq('room_id', room.id).order('created_at', { ascending: true }),
      ])

      if (ps) {
        setPlayers(ps as PlayerRow[])
        // Build stats map from DB player columns (written by resolve-round)
        const dbStats: Record<string, PlayerStats> = {}
        for (const p of ps as PlayerRow[]) {
          dbStats[p.id] = {
            rounds_survived: p.rounds_survived ?? 0,
            infections_caused: p.infections_caused ?? 0,
            special_cards_played: p.special_cards_played ?? 0,
          }
        }
        setStats(dbStats)
      }
      if (gs) setGameState(gs as GameStateResult)
      if (logs) {
        const parsed: RoundLogEntry[] = (logs as { round_number: number; outcomes: unknown }[]).map(l => ({
          round_number: l.round_number,
          outcomes: (typeof l.outcomes === 'string' ? JSON.parse(l.outcomes) : l.outcomes) as RoundOutcome[],
        }))
        setRoundLogs(parsed)
        // Fallback: if DB stats are all zeros (old game data), compute from round_log
        setStats(prev => {
          const hasDbStats = Object.values(prev).some(s => s.rounds_survived > 0)
          return hasDbStats ? prev : computeStats(parsed)
        })
      }
      if (evts) setEvents(evts as GameEvent[])
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
  const sorted = sortPlayers(players.filter(p => !p.is_bot), winnerPlayerId, stats)

  const aliveNonBots = players.filter(p => !p.is_bot && p.status !== 'eliminated')
  const aliveHumans = aliveNonBots.filter(p => p.status === 'alive')
  const aliveZombies = aliveNonBots.filter(p => p.status === 'infected')
  const isDeadWalkCase = winnerFaction === 'humans' && aliveHumans.length === 1 && aliveZombies.length === 0

  const factionColor = winnerFaction === 'humans' ? '#4499ff' : 'var(--color-green)'
  const factionText = winnerFaction === 'humans'
    ? (isDeadWalkCase ? 'THE DEAD WALK' : 'HUMANITY PREVAILS')
    : 'ZOMBIES WON'
  const factionBg = winnerFaction === 'humans' ? 'rgba(0,0,40,0.8)' : 'rgba(0,20,0,0.8)'

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AtmosphericBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/assets/zombie_hunt_logo.svg" alt="ZOMBIE HUNT" style={{ width: '180px', height: 'auto', display: 'inline-block' }} />
        </div>
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
                    {stats[winner.id]?.rounds_survived ?? 0} rounds · {stats[winner.id]?.infections_caused ?? 0} infected
                  </div>
                </div>
              </div>
            )}

            {/* Table headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 60px 60px', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
              {['#', 'PLAYER', 'STATUS', 'ROUNDS', 'INFECTED', 'SPECIALS'].map(h => (
                <span key={h} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>{h}</span>
              ))}
            </div>

            {sorted.map((p, i) => {
              const isMe = p.user_id === user?.id
              const isWinner = p.id === winnerPlayerId
              return (
                <div key={p.id}
                  style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 60px 60px', gap: '8px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: isMe ? '2px solid var(--color-red)' : '2px solid transparent', transition: 'background 150ms' }}
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
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)' }}>{stats[p.id]?.rounds_survived ?? 0}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: (stats[p.id]?.infections_caused ?? 0) > 0 ? 'var(--color-green)' : 'var(--color-text-muted)' }}>{stats[p.id]?.infections_caused ?? 0}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: (stats[p.id]?.special_cards_played ?? 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{stats[p.id]?.special_cards_played ?? 0}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* GAME STORY TAB */}
        {tab === 'story' && (() => {
          const playerMap: Record<string, string> = {}
          for (const p of players) playerMap[p.id] = p.username

          interface StoryLine { round: number; text: string; color: string }
          const storyLines: StoryLine[] = []

          // Primary: use game_events (written by new resolve-round, includes usernames)
          const storyEvents = events.filter(e => e.event_type !== 'game_end')
          if (storyEvents.length > 0) {
            for (const e of storyEvents) {
              // Prefer stored username; fall back to id→playerMap lookup; last resort 'Unknown'
              const actor = e.actor_username ?? playerMap[e.actor_id ?? ''] ?? 'Unknown'
              const target = e.target_username ?? playerMap[e.target_id ?? ''] ?? 'Unknown'
              if (e.event_type === 'infection') {
                storyLines.push({ round: e.round_number, text: `${actor} played a zombie card, infecting ${target}`, color: 'var(--color-green)' })
              } else if (e.event_type === 'elimination') {
                const cause = (e.metadata?.cause as string) ?? 'shotgun'
                const verb = cause === 'shotgun' ? 'fired a shotgun, eliminating' : 'eliminated'
                storyLines.push({ round: e.round_number, text: `${actor} ${verb} ${target}`, color: 'var(--color-red)' })
              } else if (e.event_type === 'vaccine_used') {
                // actor = vaccine user, target = the player who was cured
                const actorLabel = actor === target ? actor : `${actor} → ${target}`
                storyLines.push({ round: e.round_number, text: `${actorLabel} used a vaccine — ${target} is cured`, color: '#4499ff' })
              }
              // card_stolen events intentionally omitted for readability
            }
          } else {
            // Fallback: derive from round_log outcomes (older game data)
            for (const log of roundLogs) {
              for (const o of log.outcomes) {
                const a = playerMap[o.playerA_id] ?? 'Unknown'
                const b = playerMap[o.playerB_id] ?? 'Unknown'
                const winnerName = o.winner_id ? (playerMap[o.winner_id] ?? 'Unknown') : null
                const loserName = winnerName ? (winnerName === a ? b : a) : null
                if (o.event === 'infection') {
                  const infectorName = o.infector_id ? (playerMap[o.infector_id] ?? 'Unknown') : (winnerName ?? a)
                  const infectedName = o.infected_id ? (playerMap[o.infected_id] ?? 'Unknown') : (infectorName === a ? b : a)
                  storyLines.push({ round: log.round_number, text: `${infectorName} played a zombie card, infecting ${infectedName}`, color: 'var(--color-green)' })
                } else if (o.event === 'vaccine') {
                  // winner_id is now set to the vaccine holder; cured_id is who was cured
                  const healerName = o.winner_id ? (playerMap[o.winner_id] ?? 'Unknown') : (winnerName ?? a)
                  const curedName = o.cured_id ? (playerMap[o.cured_id] ?? 'Unknown') : (healerName === a ? b : a)
                  const label = healerName === curedName ? healerName : `${healerName} → ${curedName}`
                  storyLines.push({ round: log.round_number, text: `${label} used a vaccine — ${curedName} is cured`, color: '#4499ff' })
                } else if (o.event === 'elimination') {
                  storyLines.push({ round: log.round_number, text: `${winnerName} fired a shotgun, eliminating ${loserName}`, color: 'var(--color-red)' })
                } else if (o.event === 'draw') {
                  storyLines.push({ round: log.round_number, text: `${a} and ${b} played equally — no winner`, color: 'var(--color-text-muted)' })
                } else {
                  const msg = winnerName ? `${winnerName} outplayed ${loserName} in a card duel` : `${a} and ${b} clashed`
                  storyLines.push({ round: log.round_number, text: msg, color: 'var(--color-warning)' })
                }
              }
            }
          }

          // Closing line
          const closingText = winnerFaction === 'humans'
            ? (isDeadWalkCase
              ? 'Only one human remains while no infected survive. The dead walk.'
              : 'The zombie threat has been neutralized. Humanity prevails.')
            : winnerFaction === 'zombies'
            ? 'The infected have overwhelmed the survivors. Zombies won.'
            : 'The conflict ends — no faction claimed total victory.'

          return (
            <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '1px solid var(--color-border)' }}>
              {storyLines.length === 0 ? (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '24px 0' }}>No round data recorded yet.</div>
              ) : (
                <>
                  {storyLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ position: 'relative', marginBottom: '14px', paddingLeft: '16px' }}
                    >
                      <div style={{
                        position: 'absolute', left: '-28px', top: '5px',
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: line.color,
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 6px', flexShrink: 0 }}>
                          R{line.round}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text)' }}>
                          {line.text}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: storyLines.length * 0.04 + 0.2 }}
                    style={{ position: 'relative', marginTop: '24px', paddingLeft: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}
                  >
                    <div style={{
                      position: 'absolute', left: '-28px', top: '20px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: factionColor,
                    }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: factionColor, fontStyle: 'italic' }}>
                      {closingText}
                    </span>
                  </motion.div>
                </>
              )}
            </div>
          )
        })()}

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
