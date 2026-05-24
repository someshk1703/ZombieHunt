import { ButtonHTMLAttributes, ReactNode } from 'react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
}

export default function LoadingButton({ loading, children, disabled, style, ...rest }: LoadingButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        pointerEvents: loading ? 'none' : 'auto',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading ? (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.1em' }}>
          LOADING...
        </span>
      ) : children}
    </button>
  )
}
