'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import type { UserFramework, DailyFrameworkSubmission, DailyFrameworkItem, FrameworkCriteria } from '@/lib/types'

interface ActiveFrameworkCardProps {
  activeFramework: UserFramework | null
  todaySubmission: DailyFrameworkSubmission | null
  todayItems: DailyFrameworkItem[]
}

type FrameworkStatus = 'complete' | 'partial' | 'missed' | 'in_progress'

function getFrameworkStatus(
  completedCount: number,
  totalCount: number,
  submission: DailyFrameworkSubmission | null
): FrameworkStatus {
  if (submission?.status === 'complete') return 'complete'
  if (submission?.status === 'partial') return 'partial'
  if (submission?.status === 'zero') return 'missed'

  // Not submitted yet - show in_progress status
  if (completedCount === totalCount && totalCount > 0) return 'complete'
  if (completedCount > 0) return 'partial'
  return 'in_progress'
}

const statusConfig: Record<FrameworkStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  complete: { label: 'Complete', color: 'text-green-500', icon: CheckCircle2 },
  partial: { label: 'Partial', color: 'text-yellow-500', icon: AlertCircle },
  missed: { label: 'Missed', color: 'text-red-500', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'text-muted-foreground', icon: Circle },
}

export function ActiveFrameworkCard({ activeFramework, todaySubmission, todayItems }: ActiveFrameworkCardProps) {
  const router = useRouter()

  if (!activeFramework?.framework_template) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground text-center">
          No active framework. Set one up in Structure.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={() => router.push('/structure')}
        >
          Open Structure
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    )
  }

  const criteria = activeFramework.framework_template.criteria as FrameworkCriteria
  const totalCount = criteria?.items?.length || 0
  const completedCount = todayItems.filter(item => item.completed).length
  const status = getFrameworkStatus(completedCount, totalCount, todaySubmission)
  const { label, color, icon: StatusIcon } = statusConfig[status]

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-foreground">
          {activeFramework.framework_template.title}
        </h3>
        <div className={`flex items-center gap-1 ${color}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm font-medium text-foreground">
          {completedCount} / {totalCount}
        </span>
      </div>

      {/* CTA */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => router.push('/structure')}
      >
        Open Framework
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}
