import { useEffect, useRef, useState } from 'react'
import { getAdjustedNow } from '../lib/supabase'

interface TimerDisplayProps {
  deadline: string | null
  totalSeconds?: number
  size?: 'sm' | 'md' | 'lg'
  onExpire?: () => void
}

export default function TimerDisplay({
  deadline,
  totalSeconds = 30,
  size = 'md',
  onExpire,
}: TimerDisplayProps) {
  const [remainingMs, setRemainingMs] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (!deadline) return
    expiredRef.current = false

    const tick = () => {
      const deadlineMs = new Date(deadline).getTime()
      if (isNaN(deadlineMs)) {
        console.error('Invalid deadline:', deadline)
        return
      }
      const remaining = Math.max(0, deadlineMs - getAdjustedNow())
      setRemainingMs(remaining)

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }

    tick()
    const interval = setInterval(tick, 100)
    return () => clearInterval(interval)
  }, [deadline, onExpire])

  const seconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  const display = totalSeconds > 60
    ? `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : String(Math.max(0, seconds))

  const color = remainingMs > 10000
    ? 'var(--color-text)'
    : remainingMs > 5000
      ? 'var(--color-warning)'
      : 'var(--color-red)'

  const fontSize = { sm: '18px', md: '32px', lg: '48px' }[size]

  return (
    <span style={{
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize,
      color,
      animation: remainingMs <= 5000 && remainingMs > 0 ? 'pulse 0.5s ease infinite alternate' : 'none',
    }}>
      {display}
    </span>
  )
}
