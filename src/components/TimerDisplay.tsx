import { useEffect, useState } from 'react'

interface TimerDisplayProps {
  deadline: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: '18px', md: '28px', lg: '48px' }

export default function TimerDisplay({ deadline, size = 'md' }: TimerDisplayProps) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setRemaining(r)
    }, 100)
    return () => clearInterval(interval)
  }, [deadline])

  if (remaining === 0) return null

  const color = remaining > 10 ? 'var(--color-text)' : remaining > 5 ? 'var(--color-warning)' : 'var(--color-red)'
  const display = remaining > 60
    ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    : String(remaining)

  return (
    <span style={{
      fontFamily: "'Bebas Neue', cursive",
      fontSize: sizes[size],
      color,
      animation: remaining <= 5 ? 'pulse 0.6s infinite' : undefined,
    }}>
      {display}
    </span>
  )
}
