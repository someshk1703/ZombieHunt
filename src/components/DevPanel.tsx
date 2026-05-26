/**
 * DEV PANEL — only active in development builds (import.meta.env.DEV)
 * Toggle with Ctrl+Shift+D
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'

interface DevPanelProps {
  roomId: string
  gameStateId?: string
}

const PHASES = ['deal', 'hand_review', 'blind_action', 'reveal', 'elimination_check', 'discussion', 'finished'] as const
type Phase = typeof PHASES[number]

function uuid() { return crypto.randomUUID() }
function mockCard(type: 'zombie' | 'shotgun' | 'vaccine') {
  return { id: uuid(), type, value: type === 'zombie' ? 15 : type === 'vaccine' ? 10 : 0, suit: null, used: false }
}
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
function mockNumberCard() {
  return {
    id: uuid(),
    type: 'number' as const,
    value: Math.floor(Math.random() * 13) + 2,  // 2–14
    suit: SUITS[Math.floor(Math.random() * 4)],
    used: false,
  }
}
function mockBotHand(role: 'shotgun' | 'vaccine' | 'numbers'): object[] {
  const cards: object[] = []
  if (role !== 'numbers') cards.push(mockCard(role as 'shotgun' | 'vaccine'))
  while (cards.length < 7) cards.push(mockNumberCard())
  return cards.sort(() => Math.random() - 0.5)
}
function btnStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, border: `1px solid ${color}`, color, fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.05em' }
}

export default function DevPanel({ roomId, gameStateId: propGsId }: DevPanelProps) {
  const { user } = useGameStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [gsId, setGsId] = useState<string | undefined>(propGsId)

  useEffect(() => { if (propGsId) setGsId(propGsId) }, [propGsId])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); setOpen(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open || !import.meta.env.DEV) return
    supabase.from('game_state').select('id').eq('room_id', roomId).maybeSingle()
      .then(({ data }) => { if (data?.id) setGsId(data.id) })
  }, [open, roomId])

  if (!import.meta.env.DEV || !open) return null

  function info(msg: string) { setLog(msg) }

  async function forceStart() {
    if (!user) return
    setBusy(true)
    try {
      info('Fetching players...')
      const { data: existing } = await supabase.from('players').select('id, user_id').eq('room_id', roomId)
      const count = existing?.length ?? 0
      // Insert bots with deterministic roles matching resolve-round auto-commit logic:
      //   DEV_BOT_1 → shotgun-committer  DEV_BOT_2 → vaccine-committer  DEV_BOT_3 → number-committer
      const botRoles: Array<'shotgun' | 'vaccine' | 'numbers'> = ['shotgun', 'vaccine', 'numbers']
      const botsNeeded = Math.max(0, 3 - count)
      for (let i = 0; i < botsNeeded; i++) {
        info(`Adding bot ${i + 1}...`)
        await supabase.from('players').insert({
          room_id: roomId, user_id: uuid(), username: `DEV_BOT_${i + 1}`,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=devbot${i}`,
          status: 'alive', lives: 3, is_bot: true, is_host: false,
          is_ready: true, hand: mockBotHand(botRoles[i] ?? 'numbers'), score: 0,
        })
      }
      info('Dealing mock hand...')
      const { data: myPlayer } = await supabase.from('players').select('id').eq('room_id', roomId).eq('user_id', user.id).single()
      if (myPlayer) {
        // User gets all specials + numbers so they can test every scenario:
        // commit zombie to infect a bot, shotgun to eliminate infected, vaccine to cure infected
        const userHand = [
          mockCard('zombie'), mockCard('shotgun'), mockCard('vaccine'),
          mockNumberCard(), mockNumberCard(), mockNumberCard(), mockNumberCard(),
        ].sort(() => Math.random() - 0.5)
        await supabase.from('players').update({ hand: userHand, status: 'alive' }).eq('id', myPlayer.id)
      }
      const { data: allPlayers } = await supabase.from('players').select('id, user_id').eq('room_id', roomId)
      const pids = (allPlayers ?? []).map((p: { id: string }) => p.id)
      const pairs: string[][] = []
      for (let i = 0; i + 1 < pids.length; i += 2) pairs.push([pids[i], pids[i + 1]])
      info('Starting room...')
      await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
      const deadline = new Date(Date.now() + 60000).toISOString()
      const { data: gs, error: gsErr } = await supabase.from('game_state').insert({
        room_id: roomId, round_number: 1, phase: 'deal', pairs,
        bye_player_id: pids.length % 2 !== 0 ? pids[pids.length - 1] : null,
        committed_cards: {}, phase_deadline: deadline, negotiation_deadline: deadline,
      }).select('id').single()
      if (gsErr) throw new Error(gsErr.message)
      if (gs?.id) setGsId(gs.id)
      info('✓ Started! Phase buttons now unlocked.')
    } catch (err) {
      info(`✗ ${String(err)}`)
    }
    setBusy(false)
  }

  async function jumpToPhase(phase: Phase) {
    if (!gsId) { info('No game_state — force-start first'); return }
    setBusy(true)
    info(`Jumping to ${phase}...`)
    try {
      const deadline = new Date(Date.now() + 120000).toISOString()
      const extra: Record<string, unknown> = { phase_deadline: deadline }
      if (phase === 'blind_action') extra.negotiation_deadline = deadline
      if (phase === 'discussion') extra.discussion_started_at = new Date().toISOString()
      await supabase.from('game_state').update({ phase, ...extra }).eq('id', gsId)
      info(`✓ Phase → ${phase}`)
    } catch (err) {
      info(`✗ ${String(err)}`)
    }
    setBusy(false)
  }

  // Build committed cards for every player based on their role, then call resolve-round.
  // This bypasses the RevealScreen animation so the round always resolves correctly.
  async function resolveRound() {
    if (!gsId) { info('No game_state — force-start first'); return }
    setBusy(true)
    info('Committing bot cards + resolving...')
    try {
      const { data: allPlayers } = await supabase
        .from('players').select('id, user_id, username, hand, status').eq('room_id', roomId)
      const { data: gs } = await supabase.from('game_state').select('round_number, committed_cards').eq('id', gsId).single()
      if (!gs) throw new Error('No game_state')

      const existing = (gs as { committed_cards: Record<string, unknown> }).committed_cards ?? {}
      const committed: Record<string, unknown> = { ...existing }

      for (const p of allPlayers ?? []) {
        if (committed[p.user_id]) continue  // keep real human commit if present
        const hand: Array<{ id: string; type: string; value: number; used: boolean }> =
          Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand ?? '[]')
        const unused = (type: string) => hand.find(c => c.type === type && !c.used)
        const unusedNum = () => hand.find(c => c.type === 'number' && !c.used)
        let card
        if (p.username === 'DEV_BOT_1') card = unused('shotgun') ?? unusedNum()
        else if (p.username === 'DEV_BOT_2') card = unused('vaccine') ?? unusedNum()
        else card = unusedNum() ?? hand[0]
        if (card) committed[p.user_id] = JSON.stringify([card])
      }

      await supabase.from('game_state').update({ committed_cards: committed, phase: 'reveal' }).eq('id', gsId)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ room_id: roomId, round_number: (gs as { round_number: number }).round_number }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? res.statusText)
      info(body.gameOver ? `✓ Game over — ${body.winnerFaction} wins` : `✓ Round resolved → round ${body.nextRound}`)
    } catch (err) {
      info(`✗ ${String(err)}`)
    }
    setBusy(false)
  }

  async function resetToLobby() {
    setBusy(true)
    info('Resetting...')
    try {
      await supabase.from('players').delete().eq('room_id', roomId).eq('is_bot', true)
      await supabase.from('game_state').delete().eq('room_id', roomId)
      await supabase.from('round_log').delete().eq('room_id', roomId)
      await supabase.from('rooms').update({ status: 'lobby' }).eq('id', roomId)
      setGsId(undefined)
      info('✓ Reset to lobby')
    } catch (err) {
      info(`✗ ${String(err)}`)
    }
    setBusy(false)
  }

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
      background: '#0d0d14', border: '1px solid #ff6b00', padding: '14px 16px', width: '260px',
      fontFamily: "'IBM Plex Mono', monospace", boxShadow: '0 0 24px rgba(255,107,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '16px', color: '#ff6b00', letterSpacing: '0.1em' }}>
          ⚠ DEV PANEL
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {gsId && <span style={{ fontSize: '8px', color: '#00c800' }}>● GAME ACTIVE</span>}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      </div>

      {log && (
        <div style={{ fontSize: '9px', color: '#ff6b00', marginBottom: '10px', borderLeft: '2px solid #ff6b00', paddingLeft: '6px', wordBreak: 'break-all' }}>
          {log}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '9px', color: '#555', marginBottom: '6px', letterSpacing: '0.1em' }}>LOBBY</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={forceStart} disabled={busy} style={btnStyle('#1a4a00', '#00c800')}>▶ FORCE START</button>
          <button onClick={resetToLobby} disabled={busy} style={btnStyle('#4a1a00', '#ff6b00')}>↺ RESET</button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '9px', color: '#555', marginBottom: '6px', letterSpacing: '0.1em' }}>ROUND</div>
        <button onClick={resolveRound} disabled={busy || !gsId}
          style={btnStyle(gsId ? '#1a1a00' : '#0e0e0e', gsId ? '#ffdd00' : '#333')}>
          ⚡ RESOLVE ROUND
        </button>
        <div style={{ fontSize: '8px', color: '#444', marginTop: '4px' }}>Commits bot cards + calls resolve-round directly</div>
      </div>

      <div>
        <div style={{ fontSize: '9px', color: '#555', marginBottom: '6px', letterSpacing: '0.1em' }}>
          JUMP TO PHASE {!gsId && <span style={{ color: '#444' }}>(start first)</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PHASES.map(phase => (
            <button key={phase} onClick={() => jumpToPhase(phase)} disabled={busy || !gsId}
              style={btnStyle(gsId ? '#1a1a2a' : '#0e0e14', gsId ? '#6688ff' : '#333')}>
              {phase.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '8px', color: '#333', textAlign: 'center' }}>Ctrl+Shift+D to toggle</div>
    </div>
  )
}
