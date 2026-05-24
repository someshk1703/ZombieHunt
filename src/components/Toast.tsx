import { useState, useCallback, createContext, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'

type ToastType = 'error' | 'success' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = uuidv4()
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      // Max 3 toasts — remove oldest
      return next.length > 3 ? next.slice(next.length - 3) : next
    })
    const timer = setTimeout(() => dismiss(id), 3000)
    timers.current.set(id, timer)
  }, [dismiss])

  const borderColor: Record<ToastType, string> = {
    error: 'var(--color-red)',
    success: 'var(--color-green)',
    info: 'var(--color-text-muted)',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }}
              onClick={() => dismiss(toast.id)}
              style={{
                background: 'var(--color-surface)',
                borderLeft: `3px solid ${borderColor[toast.type]}`,
                padding: '12px 16px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: 'var(--color-text)',
                maxWidth: '320px',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
