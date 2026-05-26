import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import { audioManager } from '../lib/audio'
import { GameProvider, GameRoom, GamePlayer, GameState, useGame } from '../context/GameContext'
import AtmosphericBackground from '../components/AtmosphericBackground'
import DevPanel from '../components/DevPanel'
import DealingScreen from '../components/game/DealingScreen'
import HandReviewScreen from '../components/game/HandReviewScreen'
import GameRoundScreen from '../components/game/GameRoundScreen'
import RevealScreen from '../components/game/RevealScreen'
import EliminationCheckScreen from '../components/game/EliminationCheckScreen'
import WinRevealScreen from '../components/game/WinRevealScreen'
import GhostOverlay from '../components/game/GhostOverlay'
import DeathScreen from '../components/game/DeathScreen'
import DiscussionRoundScreen from '../components/game/DiscussionRoundScreen'

function ByeWaitingScreen({ players, roundNumber }: { players: GamePlayer[]; roundNumber: number }) {
  const alive = players.filter(p => p.status !== 'eliminated' && p.user_id !== '00000000-0000-0000-0000-000000000000')
  const competing = alive

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      fontFamily: "'IBM Plex Mono', monospace",
      padding: '24px',
      gap: '24px',
    }}>
      <div style={{
        fontSize: '11px',
        letterSpacing: '0.3em',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
      }}>
        ROUND {roundNumber}
      </div>
      <div style={{
        fontSize: '22px',
        fontWeight: 700,
        letterSpacing: '0.15em',
        color: 'var(--color-warning, #f59e0b)',
        textAlign: 'center',
        textTransform: 'uppercase',
      }}>
        BYE — WAITING
      </div>
      <div style={{
        maxWidth: '320px',
        textAlign: 'center',
        fontSize: '12px',
        lineHeight: '1.8',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em',
      }}>
        You have a bye this round. <br />
        {competing.length - 1} other survivor{competing.length - 1 !== 1 ? 's are' : ' is'} dueling right now.
        <br /><br />
        You will rejoin the next round when an odd number of players remain.
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        maxWidth: '360px',
      }}>
        {competing.map(p => (
          <div key={p.id} style={{
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: p.status === 'infected' ? 'var(--color-zombie, #4ade80)' : 'var(--color-text-muted)',
            padding: '4px 10px',
            border: '1px solid',
            borderColor: p.status === 'infected' ? 'var(--color-zombie, #4ade80)' : 'rgba(255,255,255,0.15)',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}>
            {p.username}
          </div>
        ))}
      </div>
    </div>
  )
}

function GamePhaseRouter() {
  const { gameState, myPlayer, isGhost, players } = useGame()
  const wasEliminatedRef = useRef(false)
  const [showDeathScreen, setShowDeathScreen] = useState(false)

  useEffect(() => {
    if (myPlayer.status === 'eliminated' && !wasEliminatedRef.current) {
      wasEliminatedRef.current = true
      setShowDeathScreen(true)
    }
  }, [myPlayer.status])

  const isByePlayer = gameState.bye_player_id === myPlayer.id

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AtmosphericBackground />
      {showDeathScreen && (
        <DeathScreen
          myPlayer={myPlayer}
          onDone={() => setShowDeathScreen(false)}
        />
      )}
      {isGhost && !showDeathScreen && <GhostOverlay />}
      {!showDeathScreen && (
        <>
          {gameState.phase === 'deal' && <DealingScreen />}
          {gameState.phase === 'hand_review' && <HandReviewScreen />}
          {gameState.phase === 'blind_action' && !isByePlayer && <GameRoundScreen />}
          {gameState.phase === 'blind_action' && isByePlayer && (
            <ByeWaitingScreen players={players} roundNumber={gameState.round_number} />
          )}
          {gameState.phase === 'reveal' && <RevealScreen />}
          {gameState.phase === 'elimination_check' && <EliminationCheckScreen />}
          {gameState.phase === 'discussion' && <DiscussionRoundScreen />}
          {gameState.phase === 'finished' && <WinRevealScreen />}
        </>
      )}
    </div>
  )
}

export default function Game() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, username } = useGameStore()

  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myPlayer, setMyPlayer] = useState<GamePlayer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) { navigate('/'); return }
    if (!code) { navigate('/'); return }

    // Start game ambient on first interaction
    const startAudio = () => audioManager.playAmbient('game')
    document.addEventListener('click', startAudio, { once: true })
    document.addEventListener('touchstart', startAudio, { once: true })

    async function init() {
      const upperCode = code!.toUpperCase()

      const { data: roomData, error: roomErr } = await supabase
        .from('rooms').select('*').eq('code', upperCode).single()

      if (roomErr || !roomData) { navigate('/'); return }
      if (roomData.status === 'lobby') { navigate(`/room/${upperCode}`); return }
      if (roomData.status === 'finished') { navigate(`/results/${upperCode}`); return }

      setRoom(roomData)

      const { data: playerData } = await supabase
        .from('players').select('*').eq('room_id', roomData.id)
      if (!playerData) { navigate('/'); return }
      setPlayers(playerData as GamePlayer[])

      const me = (playerData as GamePlayer[]).find(p => p.user_id === user?.id)
      if (!me) { navigate('/'); return }
      setMyPlayer(me)

      const { data: gsData } = await supabase
        .from('game_state').select('*').eq('room_id', roomData.id).single()
      if (!gsData) { navigate('/'); return }
      setGameState(gsData as GameState)

      setLoading(false)
    }

    init()
    return () => { audioManager.stopAmbient() }
  }, [code, user, username, navigate])

  if (loading || !room || !gameState || !myPlayer) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
          LOADING GAME...
        </span>
      </div>
    )
  }

  return (
    <GameProvider room={room} initialPlayers={players} gameState={gameState} myPlayer={myPlayer}>
      <GamePhaseRouter />
      <DevPanel roomId={room.id} gameStateId={gameState.id} />
    </GameProvider>
  )
}
