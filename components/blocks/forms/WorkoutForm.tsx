'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  isEditing?: boolean // True when editing an existing block (don't re-populate from session)
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

// Categories that use description instead of exercise matrix
const descriptionCategories: WorkoutCategory[] = ['running', 'sport', 'other']

// Programme session exercise format (from programme_sessions.payload)
interface ProgrammeExercise {
  exercise_name?: string
  name?: string // Alternative key
  exercise?: string // Alternative key (matrix format)
  sets?: number | Array<{ set: number; reps: string; weight: string }>
  reps?: string
  notes?: string
  sort_order?: number
}

// Transform programme session exercises to exercise matrix format
// Handles multiple possible payload structures
function transformProgrammeExercisesToMatrix(exercises: ProgrammeExercise[]) {
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) return []

  // Sort by sort_order if available
  const sorted = [...exercises].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return sorted.map((ex) => {
    // Get exercise name from various possible keys
    const exerciseName = ex.exercise_name || ex.name || ex.exercise || ''

    // Handle sets - could be a number or already an array
    let setsArray: Array<{ set: number; reps: string; weight: string }>
    if (Array.isArray(ex.sets)) {
      // Already in matrix format
      setsArray = ex.sets
    } else {
      // Convert number of sets to array
      const numSets = typeof ex.sets === 'number' ? ex.sets : 1
      setsArray = Array.from({ length: numSets }, (_, i) => ({
        set: i + 1,
        reps: ex.reps || '',
        weight: '',
      }))
    }

    return {
      exercise: exerciseName,
      sets: setsArray,
      notes: ex.notes || '',
    }
  })
}

// Extract exercises from various payload structures
function extractExercisesFromPayload(payload: any): ProgrammeExercise[] | null {
  if (!payload) return null

  // Format 1: { exercises: [...] } - Standard format
  if (payload.exercises && Array.isArray(payload.exercises)) {
    return payload.exercises
  }

  // Format 2: { exercise_matrix: [...] } - Matrix format (already transformed)
  if (payload.exercise_matrix && Array.isArray(payload.exercise_matrix)) {
    return payload.exercise_matrix
  }

  // Format 3: Direct array at root
  if (Array.isArray(payload)) {
    return payload
  }

  // Format 4: Check for any array property that looks like exercises
  for (const key of Object.keys(payload)) {
    const value = payload[key]
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0]
      // Check if it looks like an exercise object
      if (firstItem && typeof firstItem === 'object' &&
          (firstItem.exercise_name || firstItem.name || firstItem.exercise)) {
        return value
      }
    }
  }

  return null
}

export function WorkoutForm({
  form,
  activeProgramme,
  programmeSessions = [],
  isEditing = false,
}: WorkoutFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [hasPopulatedFromSession, setHasPopulatedFromSession] = useState(false)

  const hasProgramme = !!activeProgramme
  const subtype = watch('payload.subtype') || 'custom'
  const category = (watch('payload.category') || 'weight_lifting') as WorkoutCategory
  const selectedSessionId = watch('payload.programme_session_id')

  // Show matrix for custom weight lifting/hyrox/hybrid OR for programme with selected session
  const showMatrixForCustom = matrixCategories.includes(category) && subtype === 'custom'
  const showMatrixForProgramme = subtype === 'programme' && !!selectedSessionId
  const showMatrix = showMatrixForCustom || showMatrixForProgramme

  // Get selected session details
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null
    return programmeSessions.find(s => s.id === selectedSessionId) || null
  }, [selectedSessionId, programmeSessions])

  // Set defaults on mount
  useEffect(() => {
    if (!watch('payload.subtype')) {
      setValue('payload.subtype', hasProgramme ? 'programme' : 'custom')
    }
    if (!watch('payload.category')) {
      setValue('payload.category', 'weight_lifting')
    }
  }, [hasProgramme, setValue, watch])

  // When session is selected (NEW blocks only), populate the exercise matrix from session payload
  // For editing, the matrix is already loaded from block.payload by BlockModal
  useEffect(() => {
    // Skip if editing - exercise matrix is already loaded from block payload
    if (isEditing) return

    // Skip if already populated to prevent re-triggering
    if (hasPopulatedFromSession && selectedSessionId) return

    if (subtype === 'programme' && selectedSessionId && selectedSession) {
      setIsLoadingSession(true)
      setHasPopulatedFromSession(true)

      // Set title from session
      setValue('title', selectedSession.title)

      // Set programme_template_id for saving
      if (activeProgramme?.programme_template_id) {
        setValue('payload.programme_template_id', activeProgramme.programme_template_id)
      }

      // Transform and populate exercise matrix from session payload
      const sessionPayload = selectedSession.payload as any

      // Debug: Log the payload structure
      console.log('[WorkoutForm] Session payload:', sessionPayload)

      // Extract exercises from various possible payload structures
      const exercises = extractExercisesFromPayload(sessionPayload)

      if (exercises && exercises.length > 0) {
        // Always transform to ensure consistent matrix format
        const matrix = transformProgrammeExercisesToMatrix(exercises)
        if (matrix.length > 0) {
          setValue('payload.exercise_matrix', matrix)
          console.log('[WorkoutForm] Populated matrix with', matrix.length, 'exercises')
        } else {
          // Transformation failed, initialize empty matrix
          setValue('payload.exercise_matrix', [
            { exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }
          ])
        }
      } else {
        // No exercises found - initialize empty matrix
        console.log('[WorkoutForm] No exercises found in payload, initializing empty matrix')
        setValue('payload.exercise_matrix', [
          { exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }
        ])
      }

      // Copy session title for reference
      setValue('payload.session_title', selectedSession.title)

      // Small delay to show loading state
      setTimeout(() => setIsLoadingSession(false), 200)
    }
  }, [selectedSessionId, subtype, selectedSession, activeProgramme, setValue, isEditing, hasPopulatedFromSession])

  // Reset population flag when session changes (to allow re-population for different sessions)
  useEffect(() => {
    if (!selectedSessionId) {
      setHasPopulatedFromSession(false)
    }
  }, [selectedSessionId])

  // Get session title from payload for display (for editing blocks)
  const sessionTitle = watch('payload.session_title')

  return (
    <div className="space-y-4">
      {/* Programme info banner - show when editing a programme block without active programme */}
      {isEditing && subtype === 'programme' && !hasProgramme && sessionTitle && (
        <div className="p-3 bg-[rgba(59,130,246,0.08)] rounded-[10px] border border-[rgba(59,130,246,0.2)]">
          <p className="text-[12px] text-[#60a5fa] font-medium">
            📋 Programme Workout: {sessionTitle}
          </p>
        </div>
      )}

      {/* Programme/Custom Subtype Selector - only if user has active programme and not editing a programme block */}
      {hasProgramme && !(isEditing && subtype === 'programme') && (
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

      {/* Programme Session Selector - shown when Programme subtype is selected (not when editing) */}
      {subtype === 'programme' && hasProgramme && !isEditing && (
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
                onClick={() => {
                  setValue('payload.category', cat.value)
                  // Clear exercise_matrix when switching to description-based category
                  if (descriptionCategories.includes(cat.value)) {
                    setValue('payload.exercise_matrix', undefined)
                  }
                  // Initialize exercise_matrix when switching to matrix-based category
                  if (matrixCategories.includes(cat.value) && !watch('payload.exercise_matrix')?.length) {
                    setValue('payload.exercise_matrix', [
                      { exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }
                    ])
                  }
                }}
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

      {/* Exercise Matrix - for lifting/hyrox/hybrid custom workouts OR programme workouts */}
      {showMatrix && (
        <>
          {isLoadingSession ? (
            <div className="p-6 bg-[var(--surface-1)] rounded-[14px] border border-[rgba(255,255,255,0.06)] text-center">
              <p className="text-[13px] text-[rgba(238,242,255,0.52)]">Loading session...</p>
            </div>
          ) : (
            <ExerciseMatrix form={form} />
          )}
        </>
      )}

      {/* No exercises warning for programme sessions */}
      {subtype === 'programme' && selectedSessionId && !isLoadingSession && (
        (() => {
          const matrix = watch('payload.exercise_matrix')
          const hasExercises = matrix && matrix.length > 0 && matrix.some(ex => ex.exercise?.trim())
          if (!hasExercises) {
            return (
              <div className="p-3.5 bg-gradient-to-r from-[rgba(245,158,11,0.12)] to-[rgba(245,158,11,0.06)] rounded-[12px] border border-[rgba(245,158,11,0.25)]">
                <p className="text-[12px] text-amber-400 font-medium">
                  ⚠️ This session has no exercises configured. Add exercises below or switch to Custom.
                </p>
              </div>
            )
          }
          return null
        })()
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
