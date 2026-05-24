import SkeletonBase from './SkeletonBase'

export default function ChatMessageSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px 0' }}>
      <SkeletonBase width="24px" height="24px" borderRadius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <SkeletonBase width="80px" height="10px" />
        <SkeletonBase width="160px" height="12px" />
      </div>
    </div>
  )
}
