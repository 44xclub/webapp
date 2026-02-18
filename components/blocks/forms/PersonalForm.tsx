'use client'

import { useState, useCallback } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui'
import { repeatPatternLabels, weekdayLabels } from '@/lib/utils'
import { Plus, Trash2, Square, CheckSquare } from 'lucide-react'
import type { PersonalFormData, TaskItem } from '@/lib/schemas'

interface PersonalFormProps {
  form: UseFormReturn<PersonalFormData>
  editingBlockId?: string
  onPatchTasks?: (blockId: string, tasks: TaskItem[]) => Promise<unknown>
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function PersonalForm({ form, editingBlockId, onPatchTasks }: PersonalFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const repeatPattern = watch('repeat_rule.pattern') || 'none'
  const selectedWeekdays = watch('repeat_rule.weekdays') || []
  const tasks: TaskItem[] = (watch('payload.tasks') as TaskItem[] | undefined) || []

  const [newTaskText, setNewTaskText] = useState('')
  const [taskInputOpen, setTaskInputOpen] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  const toggleWeekday = (day: number) => {
    const current = selectedWeekdays || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day]
    setValue('repeat_rule.weekdays', updated)
  }

  // Persist tasks: update form + auto-save if editing existing block
  const persistTasks = useCallback(async (newTasks: TaskItem[]) => {
    setValue('payload.tasks', newTasks, { shouldDirty: true })
    if (editingBlockId && onPatchTasks) {
      try {
        await onPatchTasks(editingBlockId, newTasks)
      } catch {
        // Revert handled by patchBlockTasks
      }
    }
  }, [editingBlockId, onPatchTasks, setValue])

  const handleToggleTask = useCallback(async (taskId: string) => {
    const now = new Date().toISOString()
    const newTasks = tasks.map(t =>
      t.id === taskId
        ? { ...t, done: !t.done, completed_at: !t.done ? now : null }
        : t
    )
    await persistTasks(newTasks)
  }, [tasks, persistTasks])

  const handleAddTask = useCallback(async () => {
    const text = newTaskText.trim()
    if (!text || text.length > 120 || tasks.length >= 30) return

    setSavingTask(true)
    const newTask: TaskItem = {
      id: generateId(),
      text,
      done: false,
      sort_order: tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0,
      created_at: new Date().toISOString(),
      completed_at: null,
    }
    const newTasks = [...tasks, newTask]
    setNewTaskText('')
    await persistTasks(newTasks)
    setSavingTask(false)
  }, [newTaskText, tasks, persistTasks])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId)
    await persistTasks(newTasks)
  }, [tasks, persistTasks])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTask()
    }
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        label="Title"
        placeholder="e.g., Doctor appointment, Meeting"
        {...register('title')}
        error={errors.title?.message}
      />

      {/* Repeat Pattern */}
      <Select
        label="Repeat"
        options={Object.entries(repeatPatternLabels).map(([value, label]) => ({
          value,
          label,
        }))}
        {...register('repeat_rule.pattern')}
      />

      {/* Weekday selection for weekly */}
      {repeatPattern === 'weekly' && (
        <div>
          <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
            Select Days
          </label>
          <div className="flex gap-2 flex-wrap">
            {weekdayLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedWeekdays.includes(index)
                    ? 'bg-[rgba(255,255,255,0.09)] text-[#eef2ff] border border-[rgba(255,255,255,0.14)]'
                    : 'text-[rgba(238,242,255,0.45)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom interval */}
      {repeatPattern === 'custom' && (
        <Input
          type="number"
          label="Every N days"
          placeholder="e.g., 2 for every other day"
          min={1}
          {...register('repeat_rule.interval', {
            valueAsNumber: true,
          })}
        />
      )}

      {/* Tasks (optional checklist) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[13px] font-medium text-[rgba(238,242,255,0.72)]">
            Tasks
          </label>
          {tasks.length < 30 && (
            <button
              type="button"
              onClick={() => setTaskInputOpen(true)}
              className="flex items-center gap-1 text-[12px] text-[var(--accent-primary)] font-medium hover:text-[var(--accent-primary-light)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>

        {/* Task list */}
        {tasks.length > 0 && (
          <div className="space-y-0.5">
            {[...tasks].sort((a, b) => a.sort_order - b.sort_order).map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2 group min-h-[44px] px-1"
              >
                {/* Checkbox - 44px tap target */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center justify-center w-[44px] h-[44px] flex-shrink-0 -ml-2"
                >
                  {task.done ? (
                    <CheckSquare className="h-[18px] w-[18px] text-[var(--accent-success)]" />
                  ) : (
                    <Square className="h-[18px] w-[18px] text-[rgba(238,242,255,0.30)]" />
                  )}
                </button>

                {/* Task text */}
                <span
                  className={`flex-1 text-[14px] leading-snug truncate ${
                    task.done
                      ? 'text-[rgba(238,242,255,0.35)] line-through decoration-[rgba(238,242,255,0.20)]'
                      : 'text-[rgba(238,242,255,0.85)]'
                  }`}
                >
                  {task.text}
                </span>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="flex items-center justify-center w-8 h-8 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[rgba(238,242,255,0.30)] hover:text-[var(--accent-danger-light)] transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add task input */}
        {taskInputOpen && (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="text"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New task…"
              maxLength={120}
              autoFocus
              className="flex-1 h-[40px] px-3 text-[14px] bg-[var(--surface-2)] text-[#eef2ff] border border-[rgba(255,255,255,0.10)] rounded-[10px] placeholder:text-[rgba(238,242,255,0.30)] focus:outline-none focus:border-[rgba(59,130,246,0.5)] transition-colors"
            />
            <button
              type="button"
              onClick={handleAddTask}
              disabled={!newTaskText.trim() || savingTask}
              className="h-[40px] px-3 text-[13px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-light)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Add
            </button>
          </div>
        )}

        {tasks.length === 0 && !taskInputOpen && (
          <button
            type="button"
            onClick={() => setTaskInputOpen(true)}
            className="w-full py-3 text-center text-[13px] text-[rgba(238,242,255,0.30)] hover:text-[rgba(238,242,255,0.50)] border border-dashed border-[rgba(255,255,255,0.06)] rounded-[10px] hover:border-[rgba(255,255,255,0.12)] transition-colors"
          >
            + Add a task
          </button>
        )}
      </div>

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes..."
        {...register('notes')}
      />
    </div>
  )
}
