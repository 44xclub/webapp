'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui'
import { mealTypeLabels, repeatPatternLabels, weekdayLabels } from '@/lib/utils'
import type { NutritionFormData } from '@/lib/schemas'

interface NutritionFormProps {
  form: UseFormReturn<NutritionFormData>
}

export function NutritionForm({ form }: NutritionFormProps) {
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
      {/* Meal Type */}
      <Select
        label="Meal Type"
        options={Object.entries(mealTypeLabels).map(([value, label]) => ({
          value,
          label,
        }))}
        {...register('payload.meal_type')}
        error={errors.payload?.meal_type?.message}
      />

      {/* Meal Name */}
      <Input
        label="Meal Name / Description"
        placeholder="e.g., Chicken salad, Protein shake"
        {...register('payload.meal_name')}
        error={errors.payload?.meal_name?.message}
      />

      {/* Macros */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Macros (optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Calories"
            {...register('payload.calories', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
          />
          <Input
            type="number"
            placeholder="Protein (g)"
            {...register('payload.protein', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
          />
          <Input
            type="number"
            placeholder="Carbs (g)"
            {...register('payload.carbs', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
          />
          <Input
            type="number"
            placeholder="Fat (g)"
            {...register('payload.fat', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
          />
        </div>
      </div>

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
          <label className="block text-sm font-medium text-foreground mb-2">
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
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

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes..."
        {...register('notes')}
      />
    </div>
  )
}
