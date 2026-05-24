import SkeletonBase from './SkeletonBase'

export default function CardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: { w: 48, h: 64 }, md: { w: 72, h: 96 }, lg: { w: 96, h: 128 } }
  const { w, h } = dims[size]
  return <SkeletonBase width={`${w}px`} height={`${h}px`} borderRadius="4px" />
}
