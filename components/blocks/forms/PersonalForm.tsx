'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui'
import { TasksSection } from './TasksSection'
import { repeatPatternLabels, weekdayLabels } from '@/lib/utils'
import type { PersonalFormData } from '@/lib/schemas'
import type { TaskItem } from '@/lib/types'

interface PersonalFormProps {
  form: UseFormReturn<PersonalFormData>
  /** Callback for autosaving task toggle on existing blocks */
  onTaskToggle?: (tasks: TaskItem[]) => void
  /** Whether we're editing an existing block */
  isEditing?: boolean
}

export function PersonalForm({ form, onTaskToggle, isEditing = false }: PersonalFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const repeatPattern = watch('repeat_rule.pattern') || 'none'
  const selectedWeekdays = watch('repeat_rule.weekdays') || []
  const tasks = (watch('payload.tasks') as TaskItem[] | undefined) || []

  const toggleWeekday = (day: number) => {
    const current = selectedWeekdays || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day]
    setValue('repeat_rule.weekdays', updated)
  }

  const handleTasksChange = (updatedTasks: TaskItem[]) => {
    setValue('payload.tasks', updatedTasks, { shouldDirty: true })
  }

  const handleToggleTask = (_taskId: string, _done: boolean) => {
    // After local state update via handleTasksChange, trigger autosave
    if (onTaskToggle) {
      // Get the latest tasks from form (already updated by handleTasksChange)
      const currentTasks = form.getValues('payload.tasks') as TaskItem[] | undefined
      if (currentTasks) {
        onTaskToggle(currentTasks)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        label="Title"
        placeholder="Doctor appointment, Meeting"
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
          placeholder="2 for every other day"
          min={1}
          {...register('repeat_rule.interval', {
            valueAsNumber: true,
          })}
        />
      )}

      {/* Tasks (optional) */}
      <TasksSection
        tasks={tasks}
        onChange={handleTasksChange}
        onToggleTask={handleToggleTask}
        isEditing={isEditing}
      />

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes..."
        {...register('notes')}
      />
    </div>
  )
}
