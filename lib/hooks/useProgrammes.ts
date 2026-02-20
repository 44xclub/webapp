'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForApi } from '@/lib/date'
import { addDays, startOfWeek, getDay } from 'date-fns'
import type {
  ProgrammeTemplate,
  ProgrammeSession,
  UserProgramme,
  ProgrammeRun,
  ProgrammeProgress,
} from '@/lib/types'

/** Clean programme title by removing "(X Days)" suffix */
export function cleanProgrammeTitle(title: string): string {
  return title.replace(/\s*\(\d+\s*Days?\)\s*$/i, '').trim()
}

/** Compute programme progress from total and completed counts */
export function computeProgress(
  totalSessions: number,
  completedSessions: number
): ProgrammeProgress {
  return {
    totalSessions,
    completedSessions,
    percent: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
  }
}

export function useProgrammes(userId: string | undefined) {
  const [programmes, setProgrammes] = useState<ProgrammeTemplate[]>([])
  const [activeProgramme, setActiveProgramme] = useState<UserProgramme | null>(null)
  const [sessions, setSessions] = useState<ProgrammeSession[]>([])
  const [activeRun, setActiveRun] = useState<ProgrammeRun | null>(null)
  const [progress, setProgress] = useState<ProgrammeProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  /** Fetch active programme run for the user */
  const fetchActiveRun = useCallback(
    async (templateId: string): Promise<ProgrammeRun | null> => {
      if (!userId) return null
      try {
        const { data } = await supabase
          .from('programme_runs')
          .select('*')
          .eq('user_id', userId)
          .eq('programme_template_id', templateId)
          .eq('status', 'active')
          .single()
        return (data as ProgrammeRun) ?? null
      } catch {
        // Table may not exist yet or no active run
        return null
      }
    },
    [userId, supabase]
  )

  /** Fetch progress for active programme */
  const fetchProgress = useCallback(
    async (templateId: string, run: ProgrammeRun | null): Promise<ProgrammeProgress> => {
      // Get total sessions count
      const { count: totalCount } = await supabase
        .from('programme_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('programme_template_id', templateId)

      const totalSessions = totalCount ?? 0

      if (!run || totalSessions === 0) {
        return computeProgress(totalSessions, 0)
      }

      // Get completed sessions count
      try {
        const { count: completedCount } = await supabase
          .from('programme_session_instances')
          .select('*', { count: 'exact', head: true })
          .eq('programme_run_id', run.id)
          .not('completed_at', 'is', null)

        return computeProgress(totalSessions, completedCount ?? 0)
      } catch {
        // Table may not exist yet
        return computeProgress(totalSessions, 0)
      }
    },
    [supabase]
  )

  const fetchProgrammes = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all active programme templates (including new columns)
      const { data: templatesData, error: templatesError } = await supabase
        .from('programme_templates')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (templatesError) throw templatesError

      setProgrammes(templatesData as ProgrammeTemplate[])

      // Fetch user's active programme
      if (userId) {
        const { data: userProgrammeData } = await supabase
          .from('user_programmes')
          .select('*, programme_template:programme_templates(*)')
          .eq('user_id', userId)
          .is('deactivated_at', null)
          .single()

        setActiveProgramme(userProgrammeData as UserProgramme | null)

        // Fetch sessions for active programme
        if (userProgrammeData?.programme_template_id) {
          const { data: sessionsData } = await supabase
            .from('programme_sessions')
            .select('*')
            .eq('programme_template_id', userProgrammeData.programme_template_id)
            .order('week')
            .order('day_index')

          setSessions(sessionsData as ProgrammeSession[])

          // Fetch active run and progress
          const run = await fetchActiveRun(userProgrammeData.programme_template_id)
          setActiveRun(run)

          const prog = await fetchProgress(userProgrammeData.programme_template_id, run)
          setProgress(prog)
        }
      }
    } catch (err) {
      console.error('Failed to fetch programmes:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase, fetchActiveRun, fetchProgress])

  useEffect(() => {
    fetchProgrammes()
  }, [fetchProgrammes])

  const fetchProgrammeSessions = useCallback(
    async (programmeTemplateId: string) => {
      const { data, error } = await supabase
        .from('programme_sessions')
        .select('*')
        .eq('programme_template_id', programmeTemplateId)
        .order('week')
        .order('day_index')

      if (error) throw error

      return data as ProgrammeSession[]
    },
    [supabase]
  )

  const activateProgramme = useCallback(
    async (programmeTemplateId: string) => {
      if (!userId) throw new Error('Not authenticated')

      // Deactivate current programme if exists
      if (activeProgramme) {
        await supabase
          .from('user_programmes')
          .update({ deactivated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('programme_template_id', activeProgramme.programme_template_id)
      }

      // Activate new programme
      const { data, error } = await supabase
        .from('user_programmes')
        .upsert({
          user_id: userId,
          programme_template_id: programmeTemplateId,
          activated_at: new Date().toISOString(),
          deactivated_at: null,
        })
        .select('*, programme_template:programme_templates(*)')
        .single()

      if (error) throw error

      setActiveProgramme(data as UserProgramme)

      // Fetch sessions for the new programme
      const sessionsData = await fetchProgrammeSessions(programmeTemplateId)
      setSessions(sessionsData)

      // Fetch active run and progress for the new programme
      const run = await fetchActiveRun(programmeTemplateId)
      setActiveRun(run)
      const prog = await fetchProgress(programmeTemplateId, run)
      setProgress(prog)

      return data as UserProgramme
    },
    [userId, activeProgramme, supabase, fetchProgrammeSessions, fetchActiveRun, fetchProgress]
  )

  const deactivateProgramme = useCallback(async () => {
    if (!userId || !activeProgramme) throw new Error('No active programme')

    const today = formatDateForApi(new Date())

    // Deactivate the programme
    await supabase
      .from('user_programmes')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('programme_template_id', activeProgramme.programme_template_id)

    // Soft delete future programme blocks
    await supabase
      .from('blocks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('programme_template_id', activeProgramme.programme_template_id)
      .gt('date', today)
      .is('deleted_at', null)

    setActiveProgramme(null)
    setSessions([])
    setActiveRun(null)
    setProgress(null)
  }, [userId, activeProgramme, supabase])

  const scheduleWeek = useCallback(
    async (
      selectedDays: number[], // 0-6 for Sun-Sat
      defaultTime: string = '07:00'
    ) => {
      if (!userId || !activeProgramme || sessions.length === 0) {
        throw new Error('Cannot schedule: no active programme or sessions')
      }

      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Start from Monday
      const blocksToCreate: any[] = []

      // Get next 7 days and filter by selected days
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i)
        const dayOfWeek = getDay(day) // 0-6

        if (selectedDays.includes(dayOfWeek)) {
          const dateKey = formatDateForApi(day)
          const sessionIndex = blocksToCreate.length % sessions.length
          const session = sessions[sessionIndex]

          // Check if block already exists for this day and session
          const { data: existingBlock } = await supabase
            .from('blocks')
            .select('id')
            .eq('user_id', userId)
            .eq('date', dateKey)
            .eq('programme_session_id', session.id)
            .is('deleted_at', null)
            .single()

          if (!existingBlock) {
            blocksToCreate.push({
              user_id: userId,
              date: dateKey,
              start_time: defaultTime,
              block_type: 'workout',
              title: session.title,
              payload: session.payload,
              programme_template_id: activeProgramme.programme_template_id,
              programme_session_id: session.id,
            })
          }
        }
      }

      if (blocksToCreate.length > 0) {
        const { error } = await supabase.from('blocks').insert(blocksToCreate)
        if (error) throw error
      }

      return blocksToCreate.length
    },
    [userId, activeProgramme, sessions, supabase]
  )

  return {
    programmes,
    activeProgramme,
    sessions,
    activeRun,
    progress,
    loading,
    activateProgramme,
    deactivateProgramme,
    scheduleWeek,
    fetchProgrammeSessions,
    refetch: fetchProgrammes,
  }
}
