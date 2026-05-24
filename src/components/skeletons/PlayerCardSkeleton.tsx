import SkeletonBase from './SkeletonBase'

export default function PlayerCardSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--color-border)' }}>
      <SkeletonBase width="40px" height="40px" borderRadius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <SkeletonBase width="120px" height="14px" />
        <SkeletonBase width="80px" height="10px" />
      </div>
      <SkeletonBase width="60px" height="20px" />
    </div>
  )
}
