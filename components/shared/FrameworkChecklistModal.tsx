'use client'

import { useMemo } from 'react'
import { Modal, Checkbox } from '@/components/ui'
import { Check, X, Circle, Loader2 } from 'lucide-react'
import type {
  FrameworkTemplate,
  FrameworkCriteria,
  FrameworkCriteriaItem,
  DailyFrameworkItem,
} from '@/lib/types'

interface FrameworkChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  framework: FrameworkTemplate | undefined
  todayItems: DailyFrameworkItem[]
  completionCount: { completed: number; total: number }
  onToggleItem: (criteriaKey: string, checked: boolean) => Promise<DailyFrameworkItem>
}

export function FrameworkChecklistModal({
  isOpen,
  onClose,
  framework,
  todayItems,
  completionCount,
  onToggleItem,
}: FrameworkChecklistModalProps) {
  // Get criteria items from framework
  const criteriaItems = useMemo(() => {
    if (!framework?.criteria) return []
    const criteria = framework.criteria as FrameworkCriteria
    return criteria.items || []
  }, [framework])

  // Get completion status for each criterion
  const getItemStatus = (criteriaKey: string): boolean => {
    const item = todayItems.find((i) => i.criteria_key === criteriaKey)
    return item?.checked ?? false
  }

  // Compute status indicator
  const statusIndicator = useMemo(() => {
    const { completed, total } = completionCount
    if (total === 0) return { label: 'No items', color: 'text-muted-foreground', bg: 'bg-secondary' }
    if (completed === 0) return { label: 'Not started', color: 'text-red-500', bg: 'bg-red-500/10' }
    if (completed < total) return { label: 'In progress', color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    return { label: 'Complete', color: 'text-green-500', bg: 'bg-green-500/10' }
  }, [completionCount])

  const handleToggle = async (criteriaKey: string, currentValue: boolean) => {
    try {
      await onToggleItem(criteriaKey, !currentValue)
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  if (!framework) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={framework.title}
    >
      <div className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Progress</p>
            <p className="text-lg font-bold text-foreground">
              {completionCount.completed} / {completionCount.total}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusIndicator.color} ${statusIndicator.bg}`}>
            {statusIndicator.label}
          </span>
        </div>

        {/* Framework description */}
        {framework.description && (
          <p className="text-sm text-muted-foreground">{framework.description}</p>
        )}

        {/* Criteria checklist */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Daily Checklist</h4>
          <div className="space-y-2">
            {criteriaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No criteria defined for this framework
              </p>
            ) : (
              criteriaItems.map((item) => {
                const isCompleted = getItemStatus(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggle(item.id, isCompleted)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isCompleted
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'border-2 border-muted-foreground/30'
                      }`}
                    >
                      {isCompleted && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-green-500 line-through' : 'text-foreground'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Progress bar */}
        {completionCount.total > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  completionCount.completed === completionCount.total
                    ? 'bg-green-500'
                    : completionCount.completed > 0
                    ? 'bg-yellow-500'
                    : 'bg-muted-foreground'
                }`}
                style={{
                  width: `${(completionCount.completed / completionCount.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
