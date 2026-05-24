// Skeleton base component — shimmer animation
export default function SkeletonBase({ width = '100%', height = '16px', borderRadius = '2px', style = {} }: {
  width?: string | number
  height?: string | number
  borderRadius?: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}
