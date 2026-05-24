import { useCallback } from 'react'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useScreenShake() {
  const shake = useCallback(({ intensity = 5, duration = 300, type = 'random' }: {
    intensity?: number
    duration?: number
    type?: 'horizontal' | 'vertical' | 'random'
  } = {}) => {
    if (prefersReducedMotion()) return

    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      if (elapsed >= duration) {
        document.body.style.setProperty('--shake-x', '0px')
        document.body.style.setProperty('--shake-y', '0px')
        clearInterval(interval)
        return
      }

      const factor = 1 - elapsed / duration
      const dx = (Math.random() - 0.5) * 2 * intensity * factor
      const dy = (Math.random() - 0.5) * 2 * intensity * factor

      const x = type === 'vertical' ? 0 : dx
      const y = type === 'horizontal' ? 0 : dy

      document.body.style.setProperty('--shake-x', `${x}px`)
      document.body.style.setProperty('--shake-y', `${y}px`)
    }, 16)

    return () => {
      clearInterval(interval)
      document.body.style.setProperty('--shake-x', '0px')
      document.body.style.setProperty('--shake-y', '0px')
    }
  }, [])

  return { shake }
}
