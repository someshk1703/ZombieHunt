import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Skull } from 'lucide-react'
import { useGameStore, buildAvatarUrl } from '../store/gameStore'

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

export default function UsernameModal() {
  const { username, setPlayerIdentity } = useGameStore()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Live avatar preview — debounced 300ms
  useEffect(() => {
    if (!value.trim()) {
      setPreviewUrl(null)
      return
    }
    const timer = setTimeout(() => {
      setPreviewUrl(buildAvatarUrl(value.trim()))
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  const validate = useCallback((val: string): string => {
    if (!val.trim()) return 'You need a name to survive'
    if (val.length < 3) return 'Name must be at least 3 characters'
    if (!USERNAME_REGEX.test(val)) return 'Letters, numbers and underscores only'
    return ''
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.slice(0, 16)
    setValue(raw)
    if (error) setError(validate(raw))
  }

  const handleConfirm = async () => {
    const err = validate(value.trim())
    if (err) { setError(err); return }

    setLoading(true)
    const trimmed = value.trim()
    const avatarUrl = buildAvatarUrl(trimmed)
    setPlayerIdentity(trimmed, avatarUrl)
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
  }

  const isVisible = !username

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="username-modal"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
              padding: '32px',
              width: '100%',
              maxWidth: '380px',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2
                className="font-display"
                style={{ fontSize: '28px', color: 'var(--color-text)', letterSpacing: '0.05em' }}
              >
                IDENTIFY YOURSELF
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', letterSpacing: '0.1em' }}>
                Your name. Your fate.
              </p>
            </div>

            {/* Avatar Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid var(--color-border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-bg)',
                }}
              >
                <AnimatePresence mode="wait">
                  {previewUrl ? (
                    <motion.img
                      key={previewUrl}
                      src={previewUrl}
                      alt="avatar preview"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <motion.div
                      key="skull"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Skull size={32} color="var(--color-text-muted)" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Input */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                className="input-base"
                type="text"
                placeholder="Enter survivor name..."
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                maxLength={16}
                disabled={loading}
                autoFocus
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '12px',
                  fontSize: '10px',
                  color: value.length > 14 ? 'var(--color-red)' : 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              >
                {value.length}/16
              </span>
            </div>

            {/* Validation Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-red)',
                    marginBottom: '12px',
                    letterSpacing: '0.05em',
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Confirm Button */}
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: error ? 0 : '16px' }}
              onClick={handleConfirm}
              disabled={loading || value.length < 3}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>IDENTIFYING</span>
                  <span className="pulse-dot">.</span>
                  <span className="pulse-dot">.</span>
                  <span className="pulse-dot">.</span>
                </span>
              ) : (
                'ENTER THE GAME'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
