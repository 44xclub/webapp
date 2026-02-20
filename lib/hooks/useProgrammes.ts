'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
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

// ── Combined programme data shape ───────────────────────────────────────
interface ProgrammesData {
  programmes: ProgrammeTemplate[]
  activeProgramme: UserProgramme | null
  sessions: ProgrammeSession[]
  activeRun: ProgrammeRun | null
  progress: ProgrammeProgress | null
}

export function useProgrammes(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const { data, isLoading: loading, mutate } = useSWR<ProgrammesData>(
    userId ? ['programmes', userId] : null,
    async () => {
      // Fetch all active programme templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('programme_templates')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (templatesError) throw templatesError

      const programmes = templatesData as ProgrammeTemplate[]

      // Fetch user's active programme
      const { data: userProgrammeData } = await supabase
        .from('user_programmes')
        .select('*, programme_template:programme_templates(*)')
        .eq('user_id', userId!)
        .is('deactivated_at', null)
        .single()

      const activeProgramme = userProgrammeData as UserProgramme | null

      let sessions: ProgrammeSession[] = []
      let activeRun: ProgrammeRun | null = null
      let progress: ProgrammeProgress | null = null

      if (activeProgramme?.programme_template_id) {
        // Fetch sessions for active programme
        const { data: sessionsData } = await supabase
          .from('programme_sessions')
          .select('*')
          .eq('programme_template_id', activeProgramme.programme_template_id)
          .order('week')
          .order('day_index')

        sessions = sessionsData as ProgrammeSession[]

        // Fetch active run
        try {
          const { data: runData } = await supabase
            .from('programme_runs')
            .select('*')
            .eq('user_id', userId!)
            .eq('programme_template_id', activeProgramme.programme_template_id)
            .eq('status', 'active')
            .single()
          activeRun = (runData as ProgrammeRun) ?? null
        } catch {
          activeRun = null
        }

        // Fetch progress
        const { count: totalCount } = await supabase
          .from('programme_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('programme_template_id', activeProgramme.programme_template_id)

        const totalSessions = totalCount ?? 0

        if (activeRun && totalSessions > 0) {
          try {
            const { count: completedCount } = await supabase
              .from('programme_session_instances')
              .select('*', { count: 'exact', head: true })
              .eq('programme_run_id', activeRun.id)
              .not('completed_at', 'is', null)

            progress = computeProgress(totalSessions, completedCount ?? 0)
          } catch {
            progress = computeProgress(totalSessions, 0)
          }
        } else {
          progress = computeProgress(totalSessions, 0)
        }
      }

      return { programmes, activeProgramme, sessions, activeRun, progress }
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const fetchProgrammeSessions = useCallback(
    async (programmeTemplateId: string) => {
      const { data: sessionsData, error } = await supabase
        .from('programme_sessions')
        .select('*')
        .eq('programme_template_id', programmeTemplateId)
        .order('week')
        .order('day_index')

      if (error) throw error
      return sessionsData as ProgrammeSession[]
    },
    [supabase]
  )

  const activateProgramme = useCallback(
    async (programmeTemplateId: string) => {
      if (!userId) throw new Error('Not authenticated')

      // Deactivate current programme if exists
      if (data?.activeProgramme) {
        await supabase
          .from('user_programmes')
          .update({ deactivated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('programme_template_id', data.activeProgramme.programme_template_id)
      }

      // Activate new programme
      const { data: activated, error } = await supabase
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

      // Revalidate the full data
      mutate()
      return activated as UserProgramme
    },
    [userId, data?.activeProgramme, supabase, mutate]
  )

  const deactivateProgramme = useCallback(async () => {
    if (!userId || !data?.activeProgramme) throw new Error('No active programme')

    const today = formatDateForApi(new Date())

    await supabase
      .from('user_programmes')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('programme_template_id', data.activeProgramme.programme_template_id)

    await supabase
      .from('blocks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('programme_template_id', data.activeProgramme.programme_template_id)
      .gt('date', today)
      .is('deleted_at', null)

    mutate(
      (prev) => prev
        ? { ...prev, activeProgramme: null, sessions: [], activeRun: null, progress: null }
        : prev,
      false
    )
  }, [userId, data?.activeProgramme, supabase, mutate])

  const scheduleWeek = useCallback(
    async (selectedDays: number[], defaultTime: string = '07:00') => {
      const currentSessions = data?.sessions || []
      const activeProgramme = data?.activeProgramme
      if (!userId || !activeProgramme || currentSessions.length === 0) {
        throw new Error('Cannot schedule: no active programme or sessions')
      }

      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const blocksToCreate: any[] = []

      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i)
        const dayOfWeek = getDay(day)

        if (selectedDays.includes(dayOfWeek)) {
          const dateKey = formatDateForApi(day)
          const sessionIndex = blocksToCreate.length % currentSessions.length
          const session = currentSessions[sessionIndex]

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
    [userId, data?.activeProgramme, data?.sessions, supabase]
  )

  const refetch = useCallback(() => { mutate() }, [mutate])

  return {
    programmes: data?.programmes || [],
    activeProgramme: data?.activeProgramme ?? null,
    sessions: data?.sessions || [],
    activeRun: data?.activeRun ?? null,
    progress: data?.progress ?? null,
    loading,
    activateProgramme,
    deactivateProgramme,
    scheduleWeek,
    fetchProgrammeSessions,
    refetch,
  }
}
