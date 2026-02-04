'use client'

import { useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea } from '@/components/ui'
import { ExerciseMatrix } from '@/components/blocks/ExerciseMatrix'
import type { WorkoutFormData } from '@/lib/schemas'
import type { WorkoutCategory } from '@/lib/types'

interface WorkoutFormProps {
  form: UseFormReturn<WorkoutFormData>
  hasProgramme?: boolean
}

const workoutCategories: { value: WorkoutCategory; label: string }[] = [
  { value: 'weight_lifting', label: 'Weight Lifting' },
  { value: 'hyrox', label: 'Hyrox' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'running', label: 'Running' },
  { value: 'sport', label: 'Sport' },
  { value: 'other', label: 'Other' },
]

// Categories that show the exercise matrix
const matrixCategories: WorkoutCategory[] = ['weight_lifting', 'hyrox', 'hybrid']

export function WorkoutForm({ form, hasProgramme = false }: WorkoutFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const subtype = watch('payload.subtype') || 'custom'
  const category = (watch('payload.category') || 'weight_lifting') as WorkoutCategory
  const showMatrix = matrixCategories.includes(category)

  // Set defaults on mount
  useEffect(() => {
    if (!watch('payload.subtype')) {
      setValue('payload.subtype', hasProgramme ? 'programme' : 'custom')
    }
    if (!watch('payload.category')) {
      setValue('payload.category', 'weight_lifting')
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        label="Workout Title"
        placeholder="e.g., Push Day, Leg Day"
        {...register('title')}
        error={errors.title?.message}
      />

      {/* Workout Category (Custom only) */}
      {subtype === 'custom' && (
        <div>
          <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
            Category
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {workoutCategories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setValue('payload.category', cat.value)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all duration-150 border ${
                  category === cat.value
                    ? 'bg-[rgba(255,255,255,0.09)] text-[#eef2ff] border-[rgba(255,255,255,0.14)]'
                    : 'text-[rgba(238,242,255,0.45)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exercise Matrix - for lifting/hyrox/hybrid */}
      {showMatrix && (
        <ExerciseMatrix form={form} />
      )}

      {/* Description - for running/sport/other */}
      {!showMatrix && subtype === 'custom' && (
        <Textarea
          label="Description"
          placeholder="Describe your workout..."
          {...register('payload.description')}
        />
      )}

      {/* Optional fields */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          label="Duration (min)"
          placeholder="Optional"
          {...register('payload.duration', {
            valueAsNumber: true,
            setValueAs: (v: any) => (v === '' ? undefined : Number(v)),
          })}
        />
        <Input
          type="number"
          label="RPE (1-10)"
          placeholder="Optional"
          min={1}
          max={10}
          {...register('payload.rpe', {
            valueAsNumber: true,
            setValueAs: (v: any) => (v === '' ? undefined : Number(v)),
          })}
        />
      </div>

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional workout notes..."
        {...register('notes')}
      />
    </div>
  )
}
