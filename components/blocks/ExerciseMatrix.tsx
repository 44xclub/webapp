'use client'

import { useFieldArray, useFormContext, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { WorkoutFormData } from '@/lib/schemas'

interface ExerciseMatrixProps {
  form: UseFormReturn<WorkoutFormData>
}

export function ExerciseMatrix({ form }: ExerciseMatrixProps) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form

  const { fields: exercises, append: appendExercise, remove: removeExercise } = useFieldArray({
    control,
    name: 'payload.exercise_matrix',
  })

  const addExercise = () => {
    appendExercise({
      exercise: '',
      sets: [{ set: 1, reps: '', weight: '' }],
      notes: '',
    })
  }

  return (
    <div>
      <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
        Exercises
      </label>
      {/* Level 1 Section Surface wrapper */}
      <div className="bg-[var(--surface-1)] rounded-[14px] border border-[rgba(255,255,255,0.06)] p-3 pb-5">
        <div className="space-y-2">
          {exercises.map((field, exerciseIndex) => (
            <ExerciseRow
              key={field.id}
              form={form}
              exerciseIndex={exerciseIndex}
              canRemove={exercises.length > 1}
              onRemove={() => removeExercise(exerciseIndex)}
            />
          ))}
        </div>

        {/* Add Exercise button with proper vertical centering */}
        <div className="pt-4 pb-1 flex items-center justify-center">
          <button
            type="button"
            onClick={addExercise}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.12)] text-[13px] font-medium text-[rgba(238,242,255,0.52)] hover:border-[rgba(255,255,255,0.24)] hover:text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Exercise
          </button>
        </div>
      </div>
      {errors.payload?.exercise_matrix?.message && (
        <p className="mt-2 text-[12px] text-[#ef4444]">
          {errors.payload.exercise_matrix.message}
        </p>
      )}
    </div>
  )
}

function ExerciseRow({
  form,
  exerciseIndex,
  canRemove,
  onRemove,
}: {
  form: UseFormReturn<WorkoutFormData>
  exerciseIndex: number
  canRemove: boolean
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const { register, control, watch, setValue, formState: { errors } } = form

  const setsPath = `payload.exercise_matrix.${exerciseIndex}.sets` as const
  const { fields: sets, append: appendSet, remove: removeSet } = useFieldArray({
    control,
    name: setsPath,
  })

  const exerciseName = watch(`payload.exercise_matrix.${exerciseIndex}.exercise`)

  const addSet = () => {
    // Duplicate last row values for speed
    const lastSet = sets.length > 0 ? watch(`${setsPath}.${sets.length - 1}`) : null
    appendSet({
      set: sets.length + 1,
      reps: lastSet?.reps ?? '',
      weight: lastSet?.weight ?? '',
    })
  }

  return (
    <div className="bg-[var(--surface-2)] rounded-[12px] border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_1px_3px_rgba(0,0,0,0.2)]">
      {/* Exercise Header - min 14px vertical padding */}
      <div className="flex items-center gap-2.5 px-3.5 py-3.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-[6px] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <input
          {...register(`payload.exercise_matrix.${exerciseIndex}.exercise`)}
          placeholder="Exercise name"
          className="flex-1 bg-transparent text-[14px] font-semibold text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.30)] outline-none"
        />
        <span className="text-[11px] text-[rgba(238,242,255,0.40)] tabular-nums">
          {sets.length} {sets.length === 1 ? 'set' : 'sets'}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-[6px] text-[rgba(238,242,255,0.40)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {errors.payload?.exercise_matrix?.[exerciseIndex]?.exercise && (
        <p className="px-3 pb-1 text-[11px] text-[#ef4444]">
          {errors.payload.exercise_matrix[exerciseIndex]?.exercise?.message}
        </p>
      )}

      {/* Set Table */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)]">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_1fr_36px] gap-2 px-3.5 py-2.5 bg-[rgba(0,0,0,0.15)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)]">Set</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)]">Reps</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.35)]">Weight</span>
            <span></span>
          </div>

          {/* Set Rows - subtle dividers between rows */}
          {sets.map((setField, setIndex) => (
            <div
              key={setField.id}
              className="grid grid-cols-[40px_1fr_1fr_36px] gap-2 px-3.5 py-2 items-center border-t border-[rgba(255,255,255,0.04)]"
            >
              <span className="text-[13px] font-medium text-[rgba(238,242,255,0.52)] tabular-nums text-center">
                {setIndex + 1}
              </span>
              <input
                {...register(`payload.exercise_matrix.${exerciseIndex}.sets.${setIndex}.reps`)}
                placeholder="—"
                inputMode="numeric"
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] rounded-[8px] px-3 py-2 text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.25)] outline-none focus:border-[rgba(59,130,246,0.5)] focus:bg-[rgba(255,255,255,0.08)] transition-all tabular-nums"
              />
              <input
                {...register(`payload.exercise_matrix.${exerciseIndex}.sets.${setIndex}.weight`)}
                placeholder="—"
                inputMode="decimal"
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] rounded-[8px] px-3 py-2 text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.25)] outline-none focus:border-[rgba(59,130,246,0.5)] focus:bg-[rgba(255,255,255,0.08)] transition-all tabular-nums"
              />
              {sets.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeSet(setIndex)}
                  className="p-1.5 rounded-[6px] text-[rgba(238,242,255,0.30)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all flex items-center justify-center"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}

          {/* Add Set + Notes - min 16px vertical padding */}
          <div className="px-3.5 py-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={addSet}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium text-[rgba(238,242,255,0.52)] hover:text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add set
            </button>
            <input
              {...register(`payload.exercise_matrix.${exerciseIndex}.notes`)}
              placeholder="Notes..."
              className="text-right bg-transparent text-[12px] text-[rgba(238,242,255,0.52)] placeholder:text-[rgba(238,242,255,0.25)] outline-none w-[140px] hover:text-[rgba(238,242,255,0.72)] transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  )
}
