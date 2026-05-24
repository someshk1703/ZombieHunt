import SkeletonBase from './SkeletonBase'

export default function PlayerRowSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 60px 60px 60px', gap: '8px', padding: '10px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <SkeletonBase width="20px" height="20px" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SkeletonBase width="28px" height="28px" borderRadius="50%" />
        <SkeletonBase width="100px" height="12px" />
      </div>
      <SkeletonBase width="70px" height="20px" />
      <SkeletonBase width="30px" height="12px" />
      <SkeletonBase width="30px" height="12px" />
      <SkeletonBase width="30px" height="12px" />
      <SkeletonBase width="30px" height="12px" />
    </div>
  )
}
