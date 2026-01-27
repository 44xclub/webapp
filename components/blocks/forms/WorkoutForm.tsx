'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Input, Textarea, Button } from '@/components/ui'
import { Plus, Trash2 } from 'lucide-react'
import type { WorkoutFormData } from '@/lib/schemas'

interface WorkoutFormProps {
  form: UseFormReturn<WorkoutFormData>
}

export function WorkoutForm({ form }: WorkoutFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'payload.exercise_matrix',
  })

  const addExercise = () => {
    append({
      exercise: '',
      sets: 3,
      reps: '10',
      weight: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        label="Workout Title"
        placeholder="e.g., Push Day, Leg Day"
        {...register('title')}
        error={errors.title?.message}
      />

      {/* Exercise Matrix */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Exercises
        </label>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-3 bg-secondary/50 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Exercise {index + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Input
                placeholder="Exercise name"
                {...register(`payload.exercise_matrix.${index}.exercise`)}
                error={errors.payload?.exercise_matrix?.[index]?.exercise?.message}
              />

              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Sets"
                  {...register(`payload.exercise_matrix.${index}.sets`, {
                    valueAsNumber: true,
                  })}
                />
                <Input
                  placeholder="Reps"
                  {...register(`payload.exercise_matrix.${index}.reps`)}
                />
                <Input
                  placeholder="Weight"
                  {...register(`payload.exercise_matrix.${index}.weight`)}
                />
              </div>

              <Input
                placeholder="Notes (optional)"
                {...register(`payload.exercise_matrix.${index}.notes`)}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExercise}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Exercise
          </Button>
        </div>
        {errors.payload?.exercise_matrix?.message && (
          <p className="mt-1 text-xs text-destructive">
            {errors.payload.exercise_matrix.message}
          </p>
        )}
      </div>

      {/* Optional fields */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          label="Duration (min)"
          placeholder="Optional"
          {...register('payload.duration', {
            valueAsNumber: true,
            setValueAs: (v) => (v === '' ? undefined : Number(v)),
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
            setValueAs: (v) => (v === '' ? undefined : Number(v)),
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
