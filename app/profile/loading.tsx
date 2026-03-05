import { ProfileSkeleton } from '@/components/ui/Skeletons'
import { AppShell } from '@/components/shared/AppShell'

export default function ProfileLoading() {
  return (
    <AppShell>
      <ProfileSkeleton />
    </AppShell>
  )
}
