import { StructureSkeleton } from '@/components/ui/Skeletons'
import { AppShell } from '@/components/shared/AppShell'

export default function StructureLoading() {
  return (
    <AppShell>
      <StructureSkeleton />
    </AppShell>
  )
}
