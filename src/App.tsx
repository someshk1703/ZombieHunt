import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from './lib/auth'
import { useGameStore } from './store/gameStore'
import { syncServerTime } from './lib/supabase'
import { audioManager } from './lib/audio'
import { ToastProvider } from './components/Toast'
import AtmosphericBackground from './components/AtmosphericBackground'
import LoadingScreen from './components/LoadingScreen'
import AudioControls from './components/AudioControls'

const Home = lazy(() => import('./pages/Home'))
const CreateRoom = lazy(() => import('./pages/CreateRoom'))
const QuickPlay = lazy(() => import('./pages/QuickPlay'))
const WaitingRoom = lazy(() => import('./pages/WaitingRoom'))
const Game = lazy(() => import('./pages/Game'))
const Results = lazy(() => import('./pages/Results'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { username } = useGameStore()
  const navigate = useNavigate()
  useEffect(() => {
    if (!username) navigate('/', { replace: true })
  }, [username, navigate])
  if (!username) return null
  return <>{children}</>
}

function BGMController() {
  const location = useLocation()
  const unlockedRef = useRef(false)

  useEffect(() => {
    const isPlayZone = location.pathname.startsWith('/game/')
    if (isPlayZone) {
      audioManager.stopBGM()
    } else {
      audioManager.playBGM()
    }
  }, [location.pathname])

  // Retry BGM after first user gesture (browser autoplay policy)
  useEffect(() => {
    const onGesture = () => {
      if (!unlockedRef.current) {
        unlockedRef.current = true
        audioManager.retryBGM()
      }
    }
    window.addEventListener('click', onGesture, { capture: true })
    window.addEventListener('touchstart', onGesture, { capture: true })
    return () => {
      window.removeEventListener('click', onGesture, true)
      window.removeEventListener('touchstart', onGesture, true)
    }
  }, [])

  return null
}

function AppRoutes() {
  return (
    <>
      <BGMController />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/quickplay" element={<ProtectedRoute><QuickPlay /></ProtectedRoute>} />
          <Route path="/room/:code" element={<WaitingRoom />} />
          <Route path="/game/:code" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/results/:code" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const { setUser } = useGameStore()

  useEffect(() => {
    if (user) setUser({ id: user.id })
  }, [user, setUser])

  useEffect(() => {
    syncServerTime()
    const interval = setInterval(syncServerTime, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <ToastProvider>
        <AtmosphericBackground />
        <LoadingScreen visible={loading} />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh' }}>
          <AppRoutes />
        </div>
        <AudioControls />
        {/* Orientation notice for very short landscape phones during game */}
        <div className="orientation-notice">
          <span style={{ fontSize: '32px' }}>📱</span>
          <span>Rotate your device for a better experience</span>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
