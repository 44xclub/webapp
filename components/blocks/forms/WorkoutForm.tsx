'use client'

import { useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea } from '@/components/ui'
import { ExerciseMatrix } from '@/components/blocks/ExerciseMatrix'
import { cn } from '@/lib/utils'
import type { WorkoutFormData } from '@/lib/schemas'
import type { WorkoutCategory, UserProgramme, ProgrammeSession } from '@/lib/types'

interface WorkoutFormProps {
  form: UseFormReturn<WorkoutFormData>
  activeProgramme?: UserProgramme | null
  programmeSessions?: ProgrammeSession[]
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

export function WorkoutForm({
  form,
  activeProgramme,
  programmeSessions = [],
}: WorkoutFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const hasProgramme = !!activeProgramme
  const subtype = watch('payload.subtype') || 'custom'
  const category = (watch('payload.category') || 'weight_lifting') as WorkoutCategory
  const selectedSessionId = watch('payload.programme_session_id')
  const showMatrix = matrixCategories.includes(category) && subtype === 'custom'

  // Set defaults on mount
  useEffect(() => {
    if (!watch('payload.subtype')) {
      setValue('payload.subtype', hasProgramme ? 'programme' : 'custom')
    }
    if (!watch('payload.category')) {
      setValue('payload.category', 'weight_lifting')
    }
  }, [hasProgramme, setValue, watch])

  // When session is selected, update title with session title
  useEffect(() => {
    if (subtype === 'programme' && selectedSessionId) {
      const session = programmeSessions.find(s => s.id === selectedSessionId)
      if (session) {
        setValue('title', session.title)
        // Also copy session payload (exercise matrix if present)
        if (session.payload) {
          setValue('payload.exercise_matrix', (session.payload as any).exercise_matrix || [])
        }
      }
    }
  }, [selectedSessionId, subtype, programmeSessions, setValue])

  return (
    <div className="space-y-4">
      {/* Programme/Custom Subtype Selector - only if user has active programme */}
      {hasProgramme && (
        <div>
          <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
            Workout Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValue('payload.subtype', 'programme')
                setValue('payload.programme_session_id', undefined)
              }}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 border',
                subtype === 'programme'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                  : 'bg-[#0d1014] text-[rgba(238,242,255,0.65)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.4)]'
              )}
            >
              Programme
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('payload.subtype', 'custom')
                setValue('payload.programme_session_id', undefined)
              }}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 border',
                subtype === 'custom'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                  : 'bg-[#0d1014] text-[rgba(238,242,255,0.65)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.4)]'
              )}
            >
              Custom
            </button>
          </div>
        </div>
      )}

      {/* Programme Session Selector - shown when Programme subtype is selected */}
      {subtype === 'programme' && hasProgramme && (
        <div>
          <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
            Select Session <span className="text-[#ef4444]">*</span>
          </label>
          {programmeSessions.length > 0 ? (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {programmeSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setValue('payload.programme_session_id', session.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-left transition-all duration-200 border',
                    selectedSessionId === session.id
                      ? 'bg-[rgba(59,130,246,0.12)] border-[#3b82f6] text-[#eef2ff]'
                      : 'bg-[#0d1014] border-[rgba(255,255,255,0.08)] text-[rgba(238,242,255,0.72)] hover:border-[rgba(255,255,255,0.16)]'
                  )}
                >
                  <div>
                    <p className="text-[13px] font-medium">{session.title}</p>
                    <p className="text-[11px] text-[rgba(238,242,255,0.45)]">
                      Week {session.week} - Day {session.day_index + 1}
                    </p>
                  </div>
                  {selectedSessionId === session.id && (
                    <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[rgba(238,242,255,0.45)] p-3 bg-[#0d1014] rounded-[10px] border border-[rgba(255,255,255,0.08)]">
              No sessions available in this programme
            </p>
          )}
          {!selectedSessionId && (
            <p className="text-[11px] text-[#f59e0b] mt-1.5">Please select a session to continue</p>
          )}
        </div>
      )}

      {/* Title - editable for custom, shown for programme */}
      {subtype === 'custom' && (
        <Input
          label="Workout Title"
          placeholder="e.g., Push Day, Leg Day"
          {...register('title')}
          error={errors.title?.message}
        />
      )}

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
                className={cn(
                  'px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-all duration-150 border',
                  category === cat.value
                    ? 'bg-[rgba(255,255,255,0.09)] text-[#eef2ff] border-[rgba(255,255,255,0.14)]'
                    : 'text-[rgba(238,242,255,0.45)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exercise Matrix - for lifting/hyrox/hybrid custom workouts */}
      {showMatrix && (
        <ExerciseMatrix form={form} />
      )}

      {/* Session Details - for running/sport/other custom workouts */}
      {!showMatrix && subtype === 'custom' && (
        <div className="space-y-4">
          <Textarea
            label="Session Description"
            placeholder="Describe your workout session..."
            {...register('payload.description')}
          />

          {/* Optional metrics - ONLY for Running (not Sport/Other) */}
          {category === 'running' && (
            <div>
              <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
                Metrics (optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Distance (km)"
                  {...register('payload.distance_km', {
                    valueAsNumber: true,
                    setValueAs: (v: any) => (v === '' ? undefined : Number(v)),
                  })}
                />
                <Input
                  placeholder="Pace (e.g., 5:30/km)"
                  {...register('payload.pace')}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* RPE field - Duration is set in step 1 */}
      <Input
        type="number"
        label="RPE (1-10)"
        placeholder="Rate of perceived exertion"
        min={1}
        max={10}
        {...register('payload.rpe', {
          valueAsNumber: true,
          setValueAs: (v: any) => (v === '' ? undefined : Number(v)),
        })}
      />

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional workout notes..."
        {...register('notes')}
      />
    </div>
  )
}
