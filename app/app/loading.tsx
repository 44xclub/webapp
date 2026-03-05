import { BlockListSkeleton, HeaderSkeleton, CompactCardSkeleton } from '@/components/ui/Skeletons'
import { AppShell } from '@/components/shared/AppShell'

export default function AppLoading() {
  return (
    <AppShell>
      <div className="content-container animate-fadeIn">
        <HeaderSkeleton />
        <div className="px-4 pt-3 space-y-4">
          <CompactCardSkeleton />
          <BlockListSkeleton count={5} />
        </div>
      </div>
    </AppShell>
  )
}
