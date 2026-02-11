'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  PersonalProgramme,
  PersonalProgrammeDay,
  PersonalProgrammeExercise,
  ProgrammeFocus,
  PersonalProgrammeStatus,
} from '@/lib/types'

interface UsePersonalProgrammesOptions {
  userId?: string
  status?: PersonalProgrammeStatus
}

interface UsePersonalProgrammesReturn {
  programmes: PersonalProgramme[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createProgramme: (data: CreateProgrammeData) => Promise<PersonalProgramme | null>
  updateProgramme: (id: string, data: UpdateProgrammeData) => Promise<boolean>
  deleteProgramme: (id: string) => Promise<boolean>
  addDay: (programmeId: string, data: CreateDayData) => Promise<PersonalProgrammeDay | null>
  updateDay: (dayId: string, data: UpdateDayData) => Promise<boolean>
  deleteDay: (dayId: string) => Promise<boolean>
  addExercise: (dayId: string, data: CreateExerciseData) => Promise<PersonalProgrammeExercise | null>
  updateExercise: (exerciseId: string, data: UpdateExerciseData) => Promise<boolean>
  deleteExercise: (exerciseId: string) => Promise<boolean>
  reorderExercises: (dayId: string, exerciseIds: string[]) => Promise<boolean>
}

interface CreateProgrammeData {
  title: string
  days_per_week: number
  focus: ProgrammeFocus
}

interface UpdateProgrammeData {
  title?: string
  days_per_week?: number
  focus?: ProgrammeFocus
  status?: PersonalProgrammeStatus
}

interface CreateDayData {
  day_index: number
  title: string
}

interface UpdateDayData {
  title?: string
  day_index?: number
}

interface CreateExerciseData {
  name: string
  sets?: number | null
  reps?: string | null
  notes?: string | null
  sort_order?: number
}

interface UpdateExerciseData {
  name?: string
  sets?: number | null
  reps?: string | null
  notes?: string | null
  sort_order?: number
}

export function usePersonalProgrammes(
  options: UsePersonalProgrammesOptions = {}
): UsePersonalProgrammesReturn {
  const { userId, status } = options
  const [programmes, setProgrammes] = useState<PersonalProgramme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchProgrammes = useCallback(async () => {
    if (!userId) {
      setProgrammes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('personal_programmes')
        .select(`
          *,
          days:personal_programme_days(
            *,
            exercises:personal_programme_exercises(
              id,
              programme_day_id,
              sort_order,
              exercise_name,
              sets,
              reps,
              notes,
              created_at
            )
          )
        `)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Sort days by day_index and exercises by sort_order
      const sorted = (data || []).map((p: any) => ({
        ...p,
        days: (p.days || [])
          .sort((a: any, b: any) => a.day_index - b.day_index)
          .map((d: any) => ({
            ...d,
            exercises: (d.exercises || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            ),
          })),
      }))

      setProgrammes(sorted)
    } catch (err) {
      console.error('[usePersonalProgrammes] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch programmes')
    } finally {
      setLoading(false)
    }
  }, [userId, status, supabase])

  useEffect(() => {
    fetchProgrammes()
  }, [fetchProgrammes])

  // Create a new programme
  const createProgramme = useCallback(
    async (data: CreateProgrammeData): Promise<PersonalProgramme | null> => {
      if (!userId) return null

      try {
        const { data: programme, error } = await supabase
          .from('personal_programmes')
          .insert({
            user_id: userId,
            title: data.title,
            days_per_week: data.days_per_week,
            focus: data.focus,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error

        // Add to admin review queue (silent notification)
        await supabase.from('admin_review_queue').insert({
          entity_type: 'programme',
          entity_id: programme.id,
          user_id: userId,
        })

        await fetchProgrammes()
        return programme
      } catch (err) {
        console.error('[usePersonalProgrammes] Create error:', err)
        setError(err instanceof Error ? err.message : 'Failed to create programme')
        return null
      }
    },
    [userId, supabase, fetchProgrammes]
  )

  // Update a programme
  const updateProgramme = useCallback(
    async (id: string, data: UpdateProgrammeData): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('personal_programmes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Update error:', err)
        setError(err instanceof Error ? err.message : 'Failed to update programme')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Delete a programme
  const deleteProgramme = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('personal_programmes')
          .delete()
          .eq('id', id)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Delete error:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete programme')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Add a day to a programme
  const addDay = useCallback(
    async (programmeId: string, data: CreateDayData): Promise<PersonalProgrammeDay | null> => {
      try {
        const { data: day, error } = await supabase
          .from('personal_programme_days')
          .insert({
            programme_id: programmeId,
            day_index: data.day_index,
            title: data.title,
          })
          .select()
          .single()

        if (error) throw error

        await fetchProgrammes()
        return day
      } catch (err) {
        console.error('[usePersonalProgrammes] Add day error:', err)
        setError(err instanceof Error ? err.message : 'Failed to add day')
        return null
      }
    },
    [supabase, fetchProgrammes]
  )

  // Update a day
  const updateDay = useCallback(
    async (dayId: string, data: UpdateDayData): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('personal_programme_days')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', dayId)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Update day error:', err)
        setError(err instanceof Error ? err.message : 'Failed to update day')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Delete a day
  const deleteDay = useCallback(
    async (dayId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('personal_programme_days')
          .delete()
          .eq('id', dayId)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Delete day error:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete day')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Add an exercise to a day
  const addExercise = useCallback(
    async (dayId: string, data: CreateExerciseData): Promise<PersonalProgrammeExercise | null> => {
      try {
        const { data: exercise, error } = await supabase
          .from('personal_programme_exercises')
          .insert({
            programme_day_id: dayId,
            exercise_name: data.name,
            sets: data.sets ?? null,
            reps: data.reps ?? null,
            notes: data.notes ?? null,
            sort_order: data.sort_order ?? 0,
          })
          .select()
          .single()

        if (error) throw error

        await fetchProgrammes()
        return exercise
      } catch (err) {
        console.error('[usePersonalProgrammes] Add exercise error:', err)
        setError(err instanceof Error ? err.message : 'Failed to add exercise')
        return null
      }
    },
    [supabase, fetchProgrammes]
  )

  // Update an exercise
  const updateExercise = useCallback(
    async (exerciseId: string, data: UpdateExerciseData): Promise<boolean> => {
      try {
        // Map interface fields to DB column names
        const updateData: Record<string, any> = {}
        if (data.name !== undefined) updateData.exercise_name = data.name
        if (data.sets !== undefined) updateData.sets = data.sets
        if (data.reps !== undefined) updateData.reps = data.reps
        if (data.notes !== undefined) updateData.notes = data.notes
        if (data.sort_order !== undefined) updateData.sort_order = data.sort_order

        const { error } = await supabase
          .from('personal_programme_exercises')
          .update(updateData)
          .eq('id', exerciseId)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Update exercise error:', err)
        setError(err instanceof Error ? err.message : 'Failed to update exercise')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Delete an exercise
  const deleteExercise = useCallback(
    async (exerciseId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('personal_programme_exercises')
          .delete()
          .eq('id', exerciseId)

        if (error) throw error

        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Delete exercise error:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete exercise')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  // Reorder exercises within a day
  const reorderExercises = useCallback(
    async (dayId: string, exerciseIds: string[]): Promise<boolean> => {
      try {
        // Update sort_order for each exercise
        const updates = exerciseIds.map((id, index) =>
          supabase
            .from('personal_programme_exercises')
            .update({ sort_order: index, updated_at: new Date().toISOString() })
            .eq('id', id)
        )

        await Promise.all(updates)
        await fetchProgrammes()
        return true
      } catch (err) {
        console.error('[usePersonalProgrammes] Reorder error:', err)
        setError(err instanceof Error ? err.message : 'Failed to reorder exercises')
        return false
      }
    },
    [supabase, fetchProgrammes]
  )

  return {
    programmes,
    loading,
    error,
    refetch: fetchProgrammes,
    createProgramme,
    updateProgramme,
    deleteProgramme,
    addDay,
    updateDay,
    deleteDay,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
  }
}

// Hook to get a single programme with full details
export function usePersonalProgramme(programmeId: string | null) {
  const [programme, setProgramme] = useState<PersonalProgramme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchProgramme = useCallback(async () => {
    if (!programmeId) {
      setProgramme(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('personal_programmes')
        .select(`
          *,
          days:personal_programme_days(
            *,
            exercises:personal_programme_exercises(
              id,
              programme_day_id,
              sort_order,
              exercise_name,
              sets,
              reps,
              notes,
              created_at
            )
          )
        `)
        .eq('id', programmeId)
        .single()

      if (fetchError) throw fetchError

      // Sort days and exercises
      const sorted = {
        ...data,
        days: (data.days || [])
          .sort((a: any, b: any) => a.day_index - b.day_index)
          .map((d: any) => ({
            ...d,
            exercises: (d.exercises || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            ),
          })),
      }

      setProgramme(sorted)
    } catch (err) {
      console.error('[usePersonalProgramme] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch programme')
    } finally {
      setLoading(false)
    }
  }, [programmeId, supabase])

  useEffect(() => {
    fetchProgramme()
  }, [fetchProgramme])

  return { programme, loading, error, refetch: fetchProgramme }
}
