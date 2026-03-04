import { HeaderSkeleton, FeedSkeleton } from '@/components/ui/Skeletons'

export default function CommunityLoading() {
  return (
    <div className="min-h-app content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      <HeaderSkeleton />
      <div className="px-4 pt-3">
        <FeedSkeleton count={3} />
      </div>
    </div>
  )
}
