import { BlockListSkeleton, HeaderSkeleton, CompactCardSkeleton } from '@/components/ui/Skeletons'

export default function AppLoading() {
  return (
    <div className="min-h-app content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <HeaderSkeleton />
      <div className="px-4 pt-3 space-y-4">
        <CompactCardSkeleton />
        <BlockListSkeleton count={5} />
      </div>
    </div>
  )
}
