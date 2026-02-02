'use client'

import { useMemo, useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { Check, Loader2 } from 'lucide-react'
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
  onDeactivate?: () => Promise<void>
}

export function FrameworkChecklistModal({
  isOpen,
  onClose,
  framework,
  todayItems,
  completionCount,
  onToggleItem,
  onDeactivate,
}: FrameworkChecklistModalProps) {
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const criteriaItems = useMemo(() => {
    if (!framework?.criteria) return []
    const criteria = framework.criteria as FrameworkCriteria | FrameworkCriteriaItem[]
    const rawItems = Array.isArray(criteria) ? criteria : (criteria.items || [])
    
    const items = rawItems.map((item: FrameworkCriteriaItem & { id?: string }) => ({
      ...item,
      key: item.key || item.id || '',
    }))
    
    if (items.length === 0 && framework) {
      console.warn('[FrameworkChecklist] Empty criteria:', {
        framework_template_id: framework.id,
        criteria_raw: framework.criteria,
      })
    }
    
    return items
  }, [framework])

  const getItemStatus = (criteriaKey: string): boolean => {
    const item = todayItems.find((i) => i.criteria_key === criteriaKey)
    return item?.checked ?? false
  }

  const handleToggle = async (criteriaKey: string, currentValue: boolean) => {
    setTogglingKey(criteriaKey)
    try {
      console.log('[FrameworkChecklist] Toggling:', { criteriaKey, newValue: !currentValue })
      await onToggleItem(criteriaKey, !currentValue)
      console.log('[FrameworkChecklist] Toggle success')
    } catch (err) {
      console.error('[FrameworkChecklist] Toggle failed:', err)
    } finally {
      setTogglingKey(null)
    }
  }

  const handleDeactivate = async () => {
    if (!onDeactivate) return
    setDeactivating(true)
    try {
      await onDeactivate()
      onClose()
    } catch (err) {
      console.error('Failed to deactivate:', err)
    } finally {
      setDeactivating(false)
    }
  }

  if (!framework) return null

  const progressPercent = completionCount.total > 0 ? (completionCount.completed / completionCount.total) * 100 : 0
  const isComplete = completionCount.completed === completionCount.total && completionCount.total > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={framework.title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#0d1014] border border-[rgba(255,255,255,0.08)]">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1">Today&apos;s Progress</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-text-primary">{completionCount.completed}</span>
              <span className="text-[16px] text-text-muted">/ {completionCount.total}</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-[12px] font-semibold ${
            isComplete 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : completionCount.completed > 0
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-[#1a1d21] text-text-muted border border-[rgba(255,255,255,0.08)]'
          }`}>
            {isComplete ? 'Complete' : completionCount.completed > 0 ? 'In Progress' : 'Not Started'}
          </div>
        </div>

        <div className="h-2 bg-[#1a1d21] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-emerald-500' : completionCount.completed > 0 ? 'bg-amber-500' : ''
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="space-y-2">
          {criteriaItems.map((item) => {
            const isCompleted = getItemStatus(item.key)
            const isToggling = togglingKey === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleToggle(item.key, isCompleted)}
                disabled={isToggling}
                className={`w-full flex items-center gap-4 p-4 rounded-[12px] border transition-all duration-200 text-left ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'bg-[#0d1014] border-[rgba(255,255,255,0.08)] hover:border-[#3b82f6]/50 hover:bg-[#0f1216]'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-[6px] flex items-center justify-center transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'border-2 border-[rgba(255,255,255,0.25)] bg-transparent'
                  }`}
                >
                  {isToggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : isCompleted ? (
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-medium leading-tight ${
                    isCompleted ? 'text-emerald-400' : 'text-text-primary'
                  }`}>
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-[12px] text-text-muted mt-1">{item.description}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {onDeactivate && (
          <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <Button
              variant="outline"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="w-full text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              {deactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate Framework'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
