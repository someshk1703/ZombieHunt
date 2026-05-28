import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import AtmosphericBackground from '../components/AtmosphericBackground'
import BackButton from '../components/BackButton'
import { Copy } from 'lucide-react'

function cardDistribution(players: number) {
  const zombieCount = Math.min(Math.max(1, Math.floor(players / 5)), players - 1)
  const vaccineCount = Math.min(Math.max(1, Math.floor(players / 4)), players - zombieCount)
  const shotgunCount = players - zombieCount
  return { zombieCount, vaccineCount, shotgunCount }
}

function SegmentedControl({ options, value, onChange }: { options: { label: string; value: string | number }[]; value: string | number; onChange: (v: string | number) => void }) {
  return (
    <div style={{ display: 'flex' }}>
      {options.map((opt, i) => (
        <button key={String(opt.value)} onClick={() => onChange(opt.value)} style={{
          flex: 1, padding: '8px 0',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          background: value === opt.value ? 'var(--color-red)' : 'transparent',
          color: value === opt.value ? '#000' : 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          borderLeft: i === 0 ? '1px solid var(--color-border)' : 'none',
          borderRadius: '2px', cursor: 'pointer',
          fontWeight: value === opt.value ? 700 : 400, transition: 'all 150ms ease',
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: '24px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</p>
        {sub && <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export default function CreateRoom() {
  const navigate = useNavigate()
  const { user, username, avatarUrl, setCurrentRoom } = useGameStore()
  const { showToast } = useToast()

  const [roomName, setRoomName] = useState(() => {
    const names = [
      'TOKYO DEATH MATCH', 'NO MERCY', 'LAST MAN STANDING', 'KILL OR BE KILLED',
      'DEAD ZONE', 'ZERO SURVIVORS', 'BLOOD ARENA', 'FINAL HOUR',
      'OUTBREAK PROTOCOL', 'HUNT OR DIE', 'NO ESCAPE', 'INFECTED GROUNDS',
      'LAST BREATH', 'DARK RECKONING', 'CHAOS PROTOCOL', 'IRON CURTAIN',
      'THE PURGE', 'EXTINCTION EVENT', 'RED ZONE', 'SAVAGE LANDS',
      'POINT OF NO RETURN', 'DOOMSDAY CLOCK', 'WASTELAND DUEL', 'FALL OF MAN',
    ]
    return names[Math.floor(Math.random() * names.length)]
  })
  const [roomNameError, setRoomNameError] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [timer, setTimer] = useState<number>(60)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const dist = cardDistribution(maxPlayers)

  function validateRoomName(name: string) {
    if (name.trim().length < 3) return 'Room name must be at least 3 characters'
    if (name.trim().length > 32) return 'Room name must be 32 characters or fewer'
    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) return 'Letters, numbers, spaces, underscores and hyphens only'
    return ''
  }

  async function handleCreate() {
    const err = validateRoomName(roomName)
    if (err) { setRoomNameError(err); return }
    setRoomNameError('')
    setLoading(true)
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc('generate_room_code')
      if (codeErr) throw codeErr
      const code = codeData as string

      const { data: room, error: roomErr } = await supabase
        .from('rooms').insert({
          host_id: user!.id, code, status: 'lobby',
          settings: { room_name: roomName.trim(), max_players: maxPlayers, round_timer_seconds: timer, allow_spectators: true, infection_visibility: false, visibility, max_lives: 1, total_rounds: maxPlayers - 1 },
        }).select().single()
      if (roomErr) throw roomErr

      await supabase.from('players').insert({
        room_id: room.id, user_id: user!.id, username, avatar_url: avatarUrl, is_host: true, is_ready: true,
      })

      setCurrentRoom({ id: room.id, code: room.code, status: room.status })
      setCreatedCode(room.code)
      await new Promise(r => setTimeout(r, 600))
      navigate(`/room/${room.code}`)
    } catch (err) {
      console.error('[create-room]', err)
      showToast('Failed to create room. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!createdCode) return
    navigator.clipboard.writeText(`${window.location.origin}/room/${createdCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const panel: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '32px', borderRadius: '2px' }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', zIndex: 1, padding: '48px 16px 32px' }}>
      <AtmosphericBackground />
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '32px' }}>
          <BackButton />
          <h1 className="font-display" style={{ fontSize: '42px', color: 'var(--color-red)', letterSpacing: '0.05em', marginTop: '12px' }}>CREATE ROOM</h1>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>Configure your game. Set the rules. Survive.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Left — Settings */}
          <div style={panel}>
            <SettingRow label="Room Name">
              <input className="input-base" value={roomName} onChange={e => { setRoomName(e.target.value.slice(0, 32)); if (roomNameError) setRoomNameError('') }} placeholder="e.g. TOKYO DEATH MATCH" maxLength={32} />
              {roomNameError && <p style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '6px' }}>{roomNameError}</p>}
            </SettingRow>

            <SettingRow label="Max Players">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <button onClick={() => setMaxPlayers(p => Math.max(3, p - 1))} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', borderRadius: '2px', fontSize: '18px' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-red)'; e.currentTarget.style.color = 'var(--color-red)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text)' }}>−</button>
                <span className="font-display" style={{ fontSize: '24px', color: 'var(--color-text)', minWidth: '32px', textAlign: 'center' }}>{maxPlayers}</span>
                <button onClick={() => setMaxPlayers(p => Math.min(20, p + 1))} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', borderRadius: '2px', fontSize: '18px' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-red)'; e.currentTarget.style.color = 'var(--color-red)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text)' }}>+</button>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>↳ {dist.zombieCount} zombie · {dist.vaccineCount} vaccine · {dist.shotgunCount} shotgun cards in play</p>
            </SettingRow>

            <SettingRow label="Action Timer" sub="Time allowed per round">
              <SegmentedControl options={[{ label: '1 MIN', value: 60 }, { label: '2 MIN', value: 120 }, { label: '3 MIN', value: 180 }]} value={timer} onChange={v => setTimer(v as number)} />
            </SettingRow>

            <SettingRow label="Total Rounds" sub="Auto-set to max players − 1">
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', color: 'var(--color-text)' }}>{maxPlayers - 1}</span>
            </SettingRow>

            <div>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Visibility</p>
              <SegmentedControl options={[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]} value={visibility} onChange={v => setVisibility(v as 'public' | 'private')} />
            </div>
          </div>

          {/* Right — Preview */}
          <div style={panel}>
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>Room Preview</p>

            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: '36px', color: 'var(--color-text)', letterSpacing: '0.3em' }}>{createdCode ?? '• • • • • •'}</p>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Code generated on creation</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
              <img src={avatarUrl ?? ''} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-bg)' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: 'var(--color-text)' }}>{username}</span>
              <span style={{ border: '1px solid var(--color-red)', color: 'var(--color-red)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', padding: '2px 6px' }}>HOST</span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              {([['Players', `Up to ${maxPlayers}`], ['Timer', `${timer / 60} min per round`], ['Total Rounds', String(maxPlayers - 1)], ['Visibility', visibility === 'public' ? 'Public' : 'Private']] as [string, string][]).map(([label, value], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px dashed var(--color-border)' : 'none' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px', padding: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              {createdCode ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace", wordBreak: 'break-all' }}>{window.location.origin}/room/{createdCode}</span>
                  <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {copied ? <span style={{ fontSize: '10px', color: 'var(--color-green)', fontFamily: "'IBM Plex Mono', monospace" }}>COPIED!</span> : <Copy size={14} />}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Share link will appear here after creation</p>
              )}
            </div>

            <button className="btn-primary" style={{ width: '100%', height: '48px', fontSize: '20px', fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em' }} onClick={handleCreate} disabled={loading}>
              {loading ? (createdCode ? 'ENTERING LOBBY...' : 'GENERATING...') : 'CREATE ROOM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
