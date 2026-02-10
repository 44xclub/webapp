'use client'

import { useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Select } from '@/components/ui'
import { mealTypeLabels, repeatPatternLabels, weekdayLabels } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NutritionFormData } from '@/lib/schemas'

interface NutritionFormProps {
  form: UseFormReturn<NutritionFormData>
}

export function NutritionForm({ form }: NutritionFormProps) {
  const [macrosExpanded, setMacrosExpanded] = useState(false)

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const repeatPattern = watch('repeat_rule.pattern') || 'none'
  const selectedWeekdays = watch('repeat_rule.weekdays') || []

  // Auto-expand if any macro values are already set (e.g., when editing)
  const hasMacros = watch('payload.calories') || watch('payload.protein') || watch('payload.carbs') || watch('payload.fat')

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

      {/* Macros - Collapsible Section */}
      <div className="border border-[rgba(255,255,255,0.06)] rounded-[10px] overflow-hidden">
        <button
          type="button"
          onClick={() => setMacrosExpanded(!macrosExpanded)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          <span className="text-[13px] font-medium text-[rgba(238,242,255,0.72)]">
            Add macros (optional)
          </span>
          {(macrosExpanded || hasMacros) ? (
            <ChevronDown className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          )}
        </button>

        {(macrosExpanded || hasMacros) && (
          <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
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
        )}
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

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes..."
        {...register('notes')}
      />
    </div>
  )
}
