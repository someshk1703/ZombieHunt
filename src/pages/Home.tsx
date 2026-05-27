import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import { audioManager } from '../lib/audio'
import UsernameModal from '../components/UsernameModal'
import JoinRoomModal from '../components/JoinRoomModal'
import RulesModal from '../components/RulesModal'

export default function Home() {
  const { username, pendingRoomCode, setPendingRoomCode } = useGameStore()
  const navigate = useNavigate()
  const [survivorsOnline, setSurvivorsOnline] = useState<number>(0)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  // Auto-open join modal if there's a pending room code after username set
  useEffect(() => {
    if (username && pendingRoomCode) {
      setJoinModalOpen(true)
    }
  }, [username, pendingRoomCode])

  // Init audio on first interaction
  useEffect(() => {
    const start = () => { audioManager.init(); document.removeEventListener('click', start); document.removeEventListener('touchstart', start) }
    document.addEventListener('click', start)
    document.addEventListener('touchstart', start)
    return () => { document.removeEventListener('click', start); document.removeEventListener('touchstart', start) }
  }, [])

  // Fetch online player count on mount + every 30s
  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('status', ['alive', 'infected'])
      setSurvivorsOnline(count ?? 0)
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const hasUsername = Boolean(username)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
      {/* Username Modal — renders on top, cannot be bypassed */}
      <UsernameModal />

      {/* Main content — blurred when no username */}
      <motion.div
        animate={{ filter: hasUsername ? 'blur(0px)' : 'blur(4px)' }}
        transition={{ duration: 0.3 }}
        style={{
          pointerEvents: hasUsername ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
          padding: '24px 16px',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        {/* Game Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/assets/zombie_hunt_logo.svg"
            alt="ZOMBIE HUNT"
            style={{ width: '100%', maxWidth: '380px', height: 'auto', display: 'block', margin: '0 auto' }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.3em', marginTop: '8px', textTransform: 'uppercase' }}>
            MULTIPLAYER SURVIVAL CARD GAME
          </p>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginBottom: '48px', letterSpacing: '0.05em' }}>
          "In this game, trust is a luxury you cannot afford."
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px', marginBottom: '24px' }}>
          <button
            className="btn-primary"
            disabled={!hasUsername}
            title={!hasUsername ? 'Set your name first' : undefined}
            onClick={() => { audioManager.play('btn_click'); navigate('/lobby/create') }}
            onMouseEnter={() => audioManager.play('btn_hover')}
          >
            CREATE ROOM
          </button>

          <button
            className="btn-primary"
            disabled={!hasUsername}
            title={!hasUsername ? 'Set your name first' : undefined}
            onClick={() => { audioManager.play('btn_click'); setJoinModalOpen(true) }}
            onMouseEnter={() => audioManager.play('btn_hover')}
          >
            JOIN ROOM
          </button>

          <button
            style={{
              background: 'none',
              border: 'none',
              color: hasUsername ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '13px',
              letterSpacing: '0.1em',
              cursor: hasUsername ? 'pointer' : 'not-allowed',
              textDecoration: 'none',
              padding: '4px 0',
              opacity: hasUsername ? 1 : 0.4,
              transition: 'color 150ms ease',
            }}
            disabled={!hasUsername}
            onClick={() => hasUsername && navigate('/quickplay')}
            onMouseEnter={e => { if (hasUsername) (e.target as HTMLElement).style.color = 'var(--color-red)'; (e.target as HTMLElement).style.textDecoration = 'underline' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--color-text-muted)'; (e.target as HTMLElement).style.textDecoration = 'none' }}
          >
            Quick Play →
          </button>

          <button
            style={{
              background: 'none', border: 'none',
              color: 'var(--color-text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px', letterSpacing: '0.15em',
              cursor: 'pointer', padding: '4px 0',
              transition: 'color 150ms ease',
            }}
            onClick={() => setRulesOpen(true)}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--color-text)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--color-text-muted)' }}
          >
            ? HOW TO PLAY
          </button>
        </div>

        {/* Survivors Online */}
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.15em', position: 'fixed', bottom: '24px' }}>
          ▸ {survivorsOnline} SURVIVORS ONLINE
        </p>
      </motion.div>

      {/* Rules Modal */}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {/* Join Room Modal */}
      {joinModalOpen && (
        <JoinRoomModal
          initialCode={pendingRoomCode ?? ''}
          canClose
          onClose={() => { setJoinModalOpen(false); setPendingRoomCode(null) }}
        />
      )}
    </div>
  )
}
