'use client'

import { useMemo } from 'react'
import { Modal } from '@/components/ui'
import { Check } from 'lucide-react'
import type {
  FrameworkTemplate,
  FrameworkCriteria,
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
  const criteriaItems = useMemo(() => {
    if (!framework?.criteria) return []
    const criteria = framework.criteria as FrameworkCriteria
    return criteria.items || []
  }, [framework])

  const getItemStatus = (criteriaKey: string): boolean => {
    const item = todayItems.find((i) => i.criteria_key === criteriaKey)
    return item?.checked ?? false
  }

  const statusIndicator = useMemo(() => {
    const { completed, total } = completionCount
    if (total === 0) return { label: 'No items', color: 'text-text-muted', bg: 'bg-canvas-card' }
    if (completed === 0) return { label: 'Not started', color: 'text-rose-400', bg: 'bg-rose-500/10' }
    if (completed < total) return { label: 'In progress', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    return { label: 'Complete', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  }, [completionCount])

  const handleToggle = async (criteriaKey: string, currentValue: boolean) => {
    try {
      await onToggleItem(criteriaKey, !currentValue)
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  if (!framework) return null

  const progressPercent = completionCount.total > 0 ? (completionCount.completed / completionCount.total) * 100 : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={framework.title}>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-[10px] bg-canvas-card border border-border">
          <div>
            <p className="text-[12px] text-text-muted">Today&apos;s Progress</p>
            <p className="text-[18px] font-semibold text-text-primary">
              {completionCount.completed} / {completionCount.total}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${statusIndicator.color} ${statusIndicator.bg}`}>
            {statusIndicator.label}
          </span>
        </div>

        {framework.description && (
          <p className="text-[13px] text-text-secondary">{framework.description}</p>
        )}

        <div className="space-y-2">
          <h4 className="text-[13px] font-medium text-text-primary">Daily Checklist</h4>
          <div className="space-y-2">
            {criteriaItems.length === 0 ? (
              <p className="text-[13px] text-text-muted py-4 text-center">
                No criteria defined for this framework
              </p>
            ) : (
              criteriaItems.map((item) => {
                const isCompleted = getItemStatus(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggle(item.id, isCompleted)}
                    className={`w-full flex items-center gap-3 p-3 min-h-[44px] rounded-[10px] border transition-colors text-left ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-canvas-card border-border hover:border-accent/50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-[5px] flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-text-muted/40'
                      }`}
                    >
                      {isCompleted && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] font-medium ${isCompleted ? 'text-emerald-400' : 'text-text-primary'}`}>
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-[12px] text-text-muted mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {completionCount.total > 0 && (
          <div className="h-2 bg-canvas-card rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                completionCount.completed === completionCount.total
                  ? 'bg-emerald-500'
                  : completionCount.completed > 0
                  ? 'bg-amber-500'
                  : 'bg-text-muted/30'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
