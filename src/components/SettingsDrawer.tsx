import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

interface RoomSettings {
  room_name?: string
  max_players: number
  round_timer_seconds: number
  allow_spectators: boolean
  infection_visibility: boolean
  visibility: string
}

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  roomId: string
  currentSettings: RoomSettings
  currentPlayerCount: number
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        position: 'relative', width: '40px', height: '20px',
        background: value ? 'rgba(204,0,0,0.2)' : 'var(--color-surface-2)',
        border: `1px solid ${value ? 'var(--color-red)' : 'var(--color-border)'}`,
        borderRadius: '2px', cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: value ? 'calc(100% - 18px)' : '2px',
        width: '14px', height: '14px',
        background: value ? 'var(--color-red)' : 'var(--color-text-muted)',
        transition: 'all 150ms ease', borderRadius: '1px', display: 'block',
      }} />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: { label: string; value: string | number }[]
  value: string | number
  onChange: (v: string | number) => void
}) {
  return (
    <div style={{ display: 'flex' }}>
      {options.map((opt, i) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '8px 0',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: value === opt.value ? 'var(--color-red)' : 'transparent',
            color: value === opt.value ? '#000' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderLeft: i === 0 ? '1px solid var(--color-border)' : 'none',
            borderRadius: '2px', cursor: 'pointer',
            fontWeight: value === opt.value ? 700 : 400, transition: 'all 150ms ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function cardDistribution(players: number) {
  const zombieCount = Math.min(Math.max(1, Math.floor(players / 5)), players - 1)
  const vaccineCount = Math.min(Math.max(1, Math.floor(players / 4)), players - zombieCount)
  return {
    zombieCount,
    vaccineCount,
    shotgunCount: players - zombieCount,
  }
}

export default function SettingsDrawer({ open, onClose, roomId, currentSettings, currentPlayerCount }: SettingsDrawerProps) {
  const { showToast } = useToast()
  const [roomName, setRoomName] = useState(currentSettings.room_name ?? '')
  const [maxPlayers, setMaxPlayers] = useState(currentSettings.max_players)
  const [timer, setTimer] = useState<number>(currentSettings.round_timer_seconds)
  const [allowSpectators, setAllowSpectators] = useState(currentSettings.allow_spectators)
  const [infectionVisibility, setInfectionVisibility] = useState(currentSettings.infection_visibility)
  const [visibility, setVisibility] = useState(currentSettings.visibility)
  const [saving, setSaving] = useState(false)
  const [confirmKick, setConfirmKick] = useState(false)

  const dist = cardDistribution(maxPlayers)
  const excessPlayers = currentPlayerCount > maxPlayers ? currentPlayerCount - maxPlayers : 0

  async function handleSave() {
    if (roomName.trim().length < 3) { showToast('Room name must be at least 3 characters', 'error'); return }
    if (excessPlayers > 0 && !confirmKick) { setConfirmKick(true); return }

    setSaving(true)
    const newSettings: RoomSettings = {
      room_name: roomName.trim(),
      max_players: maxPlayers,
      round_timer_seconds: timer,
      allow_spectators: allowSpectators,
      infection_visibility: infectionVisibility,
      visibility,
    }

    const { error } = await supabase
      .from('rooms')
      .update({ settings: newSettings })
      .eq('id', roomId)

    setSaving(false)
    if (error) { showToast('Failed to update settings', 'error'); return }
    showToast('Settings updated', 'success')
    setConfirmKick(false)
    onClose()
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px', color: 'var(--color-text-muted)',
    letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px',
  }

  const sectionStyle: React.CSSProperties = {
    paddingBottom: '20px', marginBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
            }}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '360px',
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
              zIndex: 101,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '0',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '24px', color: 'var(--color-text)', letterSpacing: '0.05em' }}>
                  EDIT SETTINGS
                </h2>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Changes apply immediately to all players
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}
              >
                × CLOSE
              </button>
            </div>

            {/* Room Name */}
            <div style={sectionStyle}>
              <p style={labelStyle}>Room Name</p>
              <input
                className="input-base"
                value={roomName}
                onChange={e => setRoomName(e.target.value.slice(0, 32))}
                maxLength={32}
                placeholder="Room name..."
              />
            </div>

            {/* Max Players */}
            <div style={sectionStyle}>
              <p style={labelStyle}>Max Players</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <button
                  onClick={() => setMaxPlayers(p => Math.max(3, p - 1))}
                  style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '18px' }}
                >
                  −
                </button>
                <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '24px', color: 'var(--color-text)', minWidth: '32px', textAlign: 'center' }}>
                  {maxPlayers}
                </span>
                <button
                  onClick={() => setMaxPlayers(p => Math.min(20, p + 1))}
                  style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '18px' }}
                >
                  +
                </button>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>
                ↳ {dist.zombieCount} zombie · {dist.vaccineCount} vaccine · {dist.shotgunCount} shotgun cards
              </p>
              {excessPlayers > 0 && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-red)', marginTop: '6px' }}>
                  ⚠ {currentPlayerCount} players exceed this limit
                </p>
              )}
            </div>

            {/* Timer */}
            <div style={sectionStyle}>
              <p style={labelStyle}>Action Timer</p>
              <SegmentedControl
                options={[{ label: '1 MIN', value: 60 }, { label: '2 MIN', value: 120 }, { label: '3 MIN', value: 180 }]}
                value={timer}
                onChange={v => setTimer(v as number)}
              />
            </div>

            {/* Ghost Mode */}
            <div style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={labelStyle}>Ghost Mode</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>Eliminated players can watch</p>
              </div>
              <ToggleSwitch value={allowSpectators} onChange={setAllowSpectators} />
            </div>

            {/* Infection Visibility */}
            <div style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={labelStyle}>Infection Reveal</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--color-text-muted)' }}>Expose infected after 2 rounds</p>
              </div>
              <ToggleSwitch value={infectionVisibility} onChange={setInfectionVisibility} />
            </div>

            {/* Visibility */}
            <div style={sectionStyle}>
              <p style={labelStyle}>Visibility</p>
              <SegmentedControl
                options={[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]}
                value={visibility}
                onChange={v => setVisibility(v as string)}
              />
            </div>

            {/* Save button */}
            {confirmKick && excessPlayers > 0 && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'var(--color-red)', marginBottom: '12px' }}>
                This will kick {excessPlayers} excess player(s). Confirm?
              </p>
            )}
            <button
              className="btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '18px', fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'APPLYING...' : confirmKick ? 'CONFIRM CHANGES' : 'APPLY CHANGES'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
