'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui'
import { repeatPatternLabels, weekdayLabels } from '@/lib/utils'
import type { HabitFormData } from '@/lib/schemas'

interface HabitFormProps {
  form: UseFormReturn<HabitFormData>
}

export function HabitForm({ form }: HabitFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const repeatPattern = watch('repeat_rule.pattern') || 'none'
  const selectedWeekdays = watch('repeat_rule.weekdays') || []

  const toggleWeekday = (day: number) => {
    const current = selectedWeekdays || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day]
    setValue('repeat_rule.weekdays', updated)
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        label="Habit Name"
        placeholder="Morning meditation, Read 30 mins"
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

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes..."
        {...register('notes')}
      />
    </div>
  )
}
