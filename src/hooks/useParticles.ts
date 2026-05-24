import { useCallback, useEffect, useRef } from 'react'

export type ParticleType = 'infection' | 'elimination' | 'win_human' | 'win_zombie' | 'spark'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  size: number
  color: string
  type: ParticleType
}

function createParticles(type: ParticleType, x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 1
    let color = 'rgba(204,0,0,'
    let vy = 0, vx = Math.cos(angle) * speed, vyBase = Math.sin(angle) * speed
    let decay = 0.02, size = Math.random() * 4 + 2

    switch (type) {
      case 'infection':
        color = `rgba(0,255,65,`
        vx = Math.cos(angle) * speed * 1.5
        vyBase = Math.sin(angle) * speed * 1.5
        decay = 0.015
        size = Math.random() * 6 + 2
        break
      case 'elimination':
        color = `rgba(204,0,0,`
        decay = 0.025
        size = Math.random() * 5 + 2
        break
      case 'win_human':
        color = `rgba(255,255,255,`
        vx = (Math.random() - 0.5) * 1
        vyBase = Math.random() * 2 + 0.5
        decay = 0.008
        size = Math.random() * 4 + 2
        break
      case 'win_zombie':
        color = `rgba(0,255,65,`
        vx = (Math.random() - 0.5) * 1
        vyBase = -(Math.random() * 2 + 0.5)
        decay = 0.008
        size = Math.random() * 4 + 2
        break
      case 'spark':
        color = `rgba(204,0,0,`
        decay = 0.06
        size = Math.random() * 3 + 1
        break
    }
    vy = vyBase
    particles.push({ x, y, vx, vy, life: 1, decay, size, color, type })
  }
  return particles
}

export function useParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;width:100vw;height:100vh;'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    canvasRef.current = canvas

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    function loop() {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.type === 'win_human' || p.type === 'win_zombie') p.vy += 0.02
        else p.vy += 0.1
        p.life -= p.decay
        ctx.beginPath()
        ctx.fillStyle = `${p.color}${p.life.toFixed(2)})`
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [])

  const emit = useCallback((type: ParticleType, options?: { x?: number; y?: number; count?: number }) => {
    const x = options?.x ?? window.innerWidth / 2
    const y = options?.y ?? window.innerHeight / 2
    const defaultCounts: Record<ParticleType, number> = { infection: 60, elimination: 80, win_human: 150, win_zombie: 100, spark: 12 }
    const count = options?.count ?? defaultCounts[type]
    particlesRef.current.push(...createParticles(type, x, y, count))
  }, [])

  return { emit }
}
