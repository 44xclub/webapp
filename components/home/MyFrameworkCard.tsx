'use client'

import { useState, useMemo, useCallback } from 'react'
import { Check, Loader2, Pencil, X, Plus, Trash2, Target } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import Link from 'next/link'
import type {
  UserFramework,
  DailyFrameworkItem,
  FrameworkCriteria,
  FrameworkCriteriaItem,
} from '@/lib/types'

interface MyFrameworkCardProps {
  activeFramework: UserFramework | null
  todayItems: DailyFrameworkItem[]
  completionCount: { completed: number; total: number }
  onToggleItem: (criteriaKey: string, checked: boolean) => Promise<DailyFrameworkItem>
  onUpdateCriteria?: (criteria: FrameworkCriteriaItem[]) => Promise<boolean>
  loading?: boolean
}

export function MyFrameworkCard({
  activeFramework,
  todayItems,
  completionCount,
  onToggleItem,
  onUpdateCriteria,
  loading = false,
}: MyFrameworkCardProps) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [editCriteria, setEditCriteria] = useState<{ key: string; label: string }[]>([])
  const [saving, setSaving] = useState(false)

  const criteriaItems = useMemo(() => {
    if (!activeFramework?.framework_template?.criteria) return []
    const criteria = activeFramework.framework_template.criteria as FrameworkCriteria | FrameworkCriteriaItem[]
    const items = Array.isArray(criteria) ? criteria : (criteria.items || [])
    return items.map((item: FrameworkCriteriaItem & { id?: string }) => ({
      ...item,
      key: item.key || item.id || '',
    }))
  }, [activeFramework])

  const getItemStatus = (criteriaKey: string): boolean => {
    const item = todayItems.find((i) => i.criteria_key === criteriaKey)
    return item?.checked ?? false
  }

  const handleToggle = async (criteriaKey: string, currentValue: boolean) => {
    setTogglingKey(criteriaKey)
    try {
      await onToggleItem(criteriaKey, !currentValue)
      // If we just checked an item (not unchecked), check if framework is now complete
      if (!currentValue) {
        // After this toggle, completed count will be current completed + 1
        const newCompleted = completionCount.completed + 1
        if (newCompleted === completionCount.total && completionCount.total > 0) {
          showToast('success', 'Framework completed — all items checked off today!')
        }
      }
    } catch {
      // Toggle failed
    } finally {
      setTogglingKey(null)
    }
  }

  const handleStartEdit = useCallback(() => {
    setEditCriteria(criteriaItems.map((item) => ({ key: item.key, label: item.label })))
    setEditing(true)
  }, [criteriaItems])

  const handleCancelEdit = () => {
    setEditing(false)
    setEditCriteria([])
  }

  const handleAddCriteria = () => {
    if (editCriteria.length >= 5) return
    const newKey = `custom_${Date.now()}`
    setEditCriteria([...editCriteria, { key: newKey, label: '' }])
  }

  const handleRemoveCriteria = (index: number) => {
    if (editCriteria.length <= 1) return
    setEditCriteria(editCriteria.filter((_, i) => i !== index))
  }

  const handleUpdateLabel = (index: number, label: string) => {
    const updated = [...editCriteria]
    updated[index] = { ...updated[index], label }
    setEditCriteria(updated)
  }

  const handleSaveEdit = async () => {
    if (!onUpdateCriteria) return
    const validCriteria = editCriteria.filter((c) => c.label.trim())
    if (validCriteria.length === 0) return

    setSaving(true)
    try {
      const items: FrameworkCriteriaItem[] = validCriteria.map((c) => ({
        key: c.key,
        label: c.label.trim(),
        type: 'boolean' as const,
      }))
      await onUpdateCriteria(items)
      setEditing(false)
      setEditCriteria([])
    } catch {
      // Save failed
    } finally {
      setSaving(false)
    }
  }

  // No active framework
  if (!activeFramework?.framework_template) {
    return (
      <div className="section-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">No Framework Active</span>
          </div>
          <Link
            href="/structure?section=frameworks"
            className="text-[12px] text-[var(--accent-blue)] font-medium hover:underline"
          >
            Set up
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="section-card">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    )
  }

  const { completed, total } = completionCount
  const progressPercent = total > 0 ? (completed / total) * 100 : 0
  const isComplete = completed === total && total > 0

  return (
    <div className="section-card">
      {/* Header — always the same */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            {activeFramework.framework_template.title}
          </h3>
          {!editing && isComplete && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              Done
            </span>
          )}
        </div>
        {!editing ? (
          onUpdateCriteria && (
            <button
              onClick={handleStartEdit}
              className="text-[12px] text-[var(--accent-blue)] hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleCancelEdit} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || editCriteria.filter((c) => c.label.trim()).length === 0}
              className="p-1 text-[var(--accent-blue)] hover:text-[#60a5fa] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Progress bar — always visible */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex-1 h-1 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : completed > 0 ? 'bg-[var(--accent-blue)]' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
          {completed}/{total}
        </span>
      </div>

      {/* Criteria list — check mode */}
      {!editing && (
        <div className="space-y-1">
          {criteriaItems.map((item) => {
            const isChecked = getItemStatus(item.key)
            const isToggling = togglingKey === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleToggle(item.key, isChecked)}
                disabled={isToggling}
                className="w-full flex items-center gap-3 py-1 text-left group"
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-[7px] flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                      : 'border-2 border-[rgba(255,255,255,0.22)] bg-transparent group-hover:border-[rgba(255,255,255,0.40)]'
                  }`}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : isChecked ? (
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  ) : null}
                </div>
                <span
                  className={`text-[13px] leading-tight ${
                    isChecked ? 'text-emerald-400 line-through' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Edit mode — same layout, criteria have editable border */}
      {editing && (
        <div className="space-y-1">
          {editCriteria.map((criterion, index) => (
            <div key={criterion.key} className="flex items-center gap-3 py-1">
              <div className="flex-shrink-0 w-7 h-7 rounded-[7px] border-2 border-[rgba(255,255,255,0.15)] bg-transparent" />
              <input
                type="text"
                value={criterion.label}
                onChange={(e) => handleUpdateLabel(index, e.target.value)}
                placeholder="Type criteria..."
                className="flex-1 min-w-0 text-[13px] leading-tight bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] border-b border-[rgba(255,255,255,0.15)] focus:border-[var(--accent-blue)] transition-colors"
                autoFocus={index === editCriteria.length - 1 && !criterion.label}
              />
              {editCriteria.length > 1 && (
                <button
                  onClick={() => handleRemoveCriteria(index)}
                  className="flex-shrink-0 text-[var(--text-muted)] hover:text-rose-400 transition-colors ml-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {editCriteria.length < 5 && (
            <button
              onClick={handleAddCriteria}
              className="flex items-center gap-3 py-1"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-[7px] border-2 border-dashed border-[rgba(255,255,255,0.10)] flex items-center justify-center">
                <Plus className="h-3 w-3 text-[var(--text-muted)]" />
              </div>
              <span className="text-[12px] text-[var(--accent-blue)]">
                Add ({editCriteria.length}/5)
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
