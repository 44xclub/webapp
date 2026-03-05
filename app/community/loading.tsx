import { HeaderSkeleton, FeedSkeleton } from '@/components/ui/Skeletons'
import { AppShell } from '@/components/shared/AppShell'

export default function CommunityLoading() {
  return (
    <AppShell>
      <div className="content-container animate-fadeIn">
        <HeaderSkeleton />
        <div className="px-4 pt-3">
          <FeedSkeleton count={3} />
        </div>
      </div>
    </AppShell>
  )
}
