import SkeletonBase from './SkeletonBase'

export default function RoomListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <SkeletonBase width="120px" height="18px" />
            <SkeletonBase width="80px" height="10px" />
          </div>
          <SkeletonBase width="60px" height="32px" />
        </div>
      ))}
    </div>
  )
}
