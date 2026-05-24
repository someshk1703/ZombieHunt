import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../lib/supabase'
import JoinRoomModal from '../components/JoinRoomModal'
import LoadingScreen from '../components/LoadingScreen'

export default function RoomRedirect() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { username, user, setCurrentRoom, setPendingRoomCode } = useGameStore()
  const [showModal, setShowModal] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!code) { navigate('/'); return }

    async function check() {
      if (!username) {
        // No username yet — save pending code and go home
        setPendingRoomCode(code!.toUpperCase())
        navigate('/', { replace: true })
        return
      }

      // Already in this room?
      if (user) {
        const { data } = await supabase
          .from('players')
          .select('id, room_id')
          .eq('user_id', user.id)
          .limit(10)

        const { data: room } = await supabase
          .from('rooms')
          .select('id, code, status')
          .eq('code', code!.toUpperCase())
          .single()

        if (room && data?.some(p => p.room_id === room.id)) {
          // Already a player — go straight to waiting room
          setCurrentRoom({ id: room.id, code: room.code, status: room.status })
          navigate(`/room/${room.code}`, { replace: true })
          return
        }
      }

      setChecking(false)
      setShowModal(true)
    }

    check()
  }, [code, username, user, navigate, setPendingRoomCode, setCurrentRoom])

  if (checking) return <LoadingScreen visible />

  return showModal ? (
    <JoinRoomModal
      initialCode={code?.toUpperCase()}
      canClose={false}
    />
  ) : null
}
