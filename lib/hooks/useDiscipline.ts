'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { formatDateForApi } from '@/lib/date'
import type {
  CommunityChallenge,
  FrameworkTemplate,
  UserFramework,
  DailyFrameworkSubmission,
  DailyFrameworkItem,
  FrameworkSubmissionStatus,
  FrameworkCriteria,
  Block,
  DailyScore,
} from '@/lib/types'

// ── Challenge data shape ────────────────────────────────────────────────
interface ChallengeData {
  challenge: CommunityChallenge | null
  todayBlock: Block | null
}

export function useCommunityChallenge(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const { data, isLoading: loading, mutate } = useSWR<ChallengeData>(
    ['challenge', userId ?? '__anon'],
    async () => {
      const today = formatDateForApi(new Date())

      // Try RPC first to get active challenge ID (DB-enforced)
      let activeChallengeId: string | null = null
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('fn_active_challenge_id', {
          p_day: today,
        })
        if (!rpcError && rpcData) {
          activeChallengeId = rpcData
        }
      } catch {
        console.warn('[Challenge] fn_active_challenge_id RPC not available')
      }

      // Fetch challenge data
      let challengeData: CommunityChallenge | null = null
      if (activeChallengeId) {
        const { data, error } = await supabase
          .from('community_challenges')
          .select('*')
          .eq('id', activeChallengeId)
          .single()
        if (!error) challengeData = data as CommunityChallenge
      } else {
        const { data, error } = await supabase
          .from('community_challenges')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .limit(1)
          .maybeSingle()

        if (error) console.error('Failed to fetch challenge:', error)
        challengeData = (data as CommunityChallenge) ?? null
      }

      // Fetch today's challenge block
      let todayBlock: Block | null = null
      if (userId && challengeData) {
        const { data: blockData } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .eq('block_type', 'challenge')
          .is('deleted_at', null)
          .limit(1)
          .single()

        todayBlock = blockData as Block | null
      }

      return { challenge: challengeData, todayBlock }
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // Log challenge via RPC
  const logChallenge = useCallback(async () => {
    if (!userId || !data?.challenge) throw new Error('Cannot log challenge')

    const challenge = data.challenge
    const today = formatDateForApi(new Date())
    const now = new Date()
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`

    try {
      const { data: blockId, error: rpcError } = await supabase.rpc('fn_create_challenge_block', {
        p_user_id: userId,
        p_day: today,
        p_start_time: startTime,
        p_title: challenge.title,
      })

      if (rpcError) {
        console.warn('[Challenge] RPC not available, using direct insert:', rpcError)
        const { data: insertedBlock, error } = await supabase
          .from('blocks')
          .insert({
            user_id: userId,
            date: today,
            start_time: startTime,
            block_type: 'challenge',
            title: challenge.title,
            challenge_id: challenge.id,
            payload: { challenge_id: challenge.id },
            is_planned: false,
            completed_at: now.toISOString(),
            performed_at: now.toISOString(),
            shared_to_feed: true,
          })
          .select()
          .single()

        if (error) throw error
        mutate({ ...data, todayBlock: insertedBlock as Block }, false)
        return insertedBlock as Block
      }

      const { data: newBlock, error: fetchError } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', blockId)
        .single()

      if (fetchError) throw fetchError
      mutate({ ...data, todayBlock: newBlock as Block }, false)
      return newBlock as Block
    } catch (err) {
      console.error('[Challenge] Failed to create challenge block:', err)
      throw err
    }
  }, [userId, data, supabase, mutate])

  const refetch = useCallback(() => { mutate() }, [mutate])

  return {
    challenge: data?.challenge ?? null,
    todayBlock: data?.todayBlock ?? null,
    loading,
    logChallenge,
    refetch,
  }
}

// ── Frameworks data shape ───────────────────────────────────────────────
interface FrameworksData {
  frameworks: FrameworkTemplate[]
  activeFramework: UserFramework | null
  todaySubmission: DailyFrameworkSubmission | null
  todayItems: DailyFrameworkItem[]
}

export function useFrameworks(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])

  const { data, isLoading: loading, mutate } = useSWR<FrameworksData>(
    userId ? ['frameworks', userId] : null,
    async () => {
      // Fetch all active framework templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('framework_templates')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (templatesError) throw templatesError

      const frameworks = templatesData as FrameworkTemplate[]

      // Fetch user's active framework
      const { data: userFrameworkData, error: userFrameworkError } = await supabase
        .from('user_frameworks')
        .select('*, framework_template:framework_templates(*)')
        .eq('user_id', userId!)
        .maybeSingle()

      if (userFrameworkError) {
        console.error('[Frameworks] Failed to fetch user framework:', userFrameworkError)
      }

      const activeFramework = userFrameworkData as UserFramework | null
      const today = formatDateForApi(new Date())

      // Ensure daily framework items exist (call RPC to hydrate)
      if (activeFramework) {
        await supabase.rpc('fn_ensure_daily_framework_items', { p_date: today })
      }

      // Fetch today's submission
      const { data: submissionData } = await supabase
        .from('daily_framework_submissions')
        .select('*')
        .eq('user_id', userId!)
        .eq('date', today)
        .single()

      const todaySubmission = submissionData as DailyFrameworkSubmission | null

      // Fetch today's framework items for the active framework only
      let todayItems: DailyFrameworkItem[] = []
      if (activeFramework?.framework_template_id) {
        const { data: itemsData } = await supabase
          .from('daily_framework_items')
          .select('*')
          .eq('user_id', userId!)
          .eq('date', today)
          .eq('framework_template_id', activeFramework.framework_template_id)

        todayItems = (itemsData as DailyFrameworkItem[]) || []
      }

      return { frameworks, activeFramework, todaySubmission, todayItems }
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const activateFramework = useCallback(
    async (frameworkTemplateId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { data: activated, error } = await supabase
        .from('user_frameworks')
        .upsert({
          user_id: userId,
          framework_template_id: frameworkTemplateId,
          activated_at: new Date().toISOString(),
        })
        .select('*, framework_template:framework_templates(*)')
        .single()

      if (error) throw error

      const today = formatDateForApi(new Date())
      await supabase.rpc('fn_ensure_daily_framework_items', { p_date: today })

      const { data: itemsData } = await supabase
        .from('daily_framework_items')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('framework_template_id', frameworkTemplateId)

      mutate(
        (prev) => ({
          frameworks: prev?.frameworks || [],
          activeFramework: activated as UserFramework,
          todaySubmission: prev?.todaySubmission ?? null,
          todayItems: (itemsData as DailyFrameworkItem[]) || [],
        }),
        false
      )
      return activated as UserFramework
    },
    [userId, supabase, mutate]
  )

  const submitDailyStatus = useCallback(
    async (status: FrameworkSubmissionStatus) => {
      if (!userId) throw new Error('Not authenticated')

      const today = formatDateForApi(new Date())

      const { data: submission, error } = await supabase
        .from('daily_framework_submissions')
        .upsert(
          {
            user_id: userId,
            date: today,
            status,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single()

      if (error) throw error

      mutate(
        (prev) => prev ? { ...prev, todaySubmission: submission as DailyFrameworkSubmission } : prev,
        false
      )
      return submission as DailyFrameworkSubmission
    },
    [userId, supabase, mutate]
  )

  // Toggle a framework criterion item
  const toggleFrameworkItem = useCallback(
    async (criteriaKey: string, checked: boolean) => {
      if (!userId) throw new Error('Not authenticated')
      if (!data?.activeFramework?.framework_template_id) throw new Error('No active framework')

      const today = formatDateForApi(new Date())

      // Optimistic update
      mutate(
        (prev) => {
          if (!prev) return prev
          const updatedItems = prev.todayItems.map((item) =>
            item.criteria_key === criteriaKey
              ? { ...item, checked, checked_at: checked ? new Date().toISOString() : null }
              : item
          )
          return { ...prev, todayItems: updatedItems }
        },
        false
      )

      const { data: updatedItem, error } = await supabase
        .from('daily_framework_items')
        .upsert(
          {
            user_id: userId,
            date: today,
            framework_template_id: data.activeFramework.framework_template_id,
            criteria_key: criteriaKey,
            checked,
            checked_at: checked ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,date,framework_template_id,criteria_key' }
        )
        .select()
        .single()

      if (error) throw error

      // Reconcile with server response
      mutate(
        (prev) => {
          if (!prev) return prev
          const exists = prev.todayItems.some((item) => item.criteria_key === criteriaKey)
          const updatedItems = exists
            ? prev.todayItems.map((item) =>
                item.criteria_key === criteriaKey ? (updatedItem as DailyFrameworkItem) : item
              )
            : [...prev.todayItems, updatedItem as DailyFrameworkItem]
          return { ...prev, todayItems: updatedItems }
        },
        false
      )

      return updatedItem as DailyFrameworkItem
    },
    [userId, data?.activeFramework, supabase, mutate]
  )

  // Deactivate framework
  const deactivateFramework = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated')

    const { data: deletedRows, error } = await supabase
      .from('user_frameworks')
      .delete()
      .eq('user_id', userId)
      .select()

    if (error) throw error

    if (!deletedRows || deletedRows.length === 0) {
      console.warn('[Frameworks] No rows deleted - check RLS policies')
    }

    mutate(
      (prev) => prev ? { ...prev, activeFramework: null, todayItems: [] } : prev,
      false
    )
  }, [userId, supabase, mutate])

  // Calculate completion count
  const completionCount = useMemo(() => {
    const activeFramework = data?.activeFramework
    const todayItems = data?.todayItems || []
    if (!activeFramework?.framework_template?.criteria) return { completed: 0, total: 0 }
    const criteria = activeFramework.framework_template.criteria as FrameworkCriteria
    const items = Array.isArray(criteria) ? criteria : (criteria.items || [])
    const total = items.length
    const completed = todayItems.filter((item) => item.checked).length
    return { completed, total }
  }, [data?.activeFramework, data?.todayItems])

  const refetch = useCallback(() => { mutate() }, [mutate])

  return {
    frameworks: data?.frameworks || [],
    activeFramework: data?.activeFramework ?? null,
    todaySubmission: data?.todaySubmission ?? null,
    todayItems: data?.todayItems || [],
    completionCount,
    loading,
    activateFramework,
    deactivateFramework,
    submitDailyStatus,
    toggleFrameworkItem,
    refetch,
  }
}

export function useDailyScores(userId: string | undefined, days: number = 7) {
  const supabase = useMemo(() => createClient(), [])

  const { data: scores, isLoading: loading, mutate } = useSWR<DailyScore[]>(
    userId ? ['daily-scores', userId, days] : null,
    async () => {
      const { data, error } = await supabase
        .from('daily_scores')
        .select('*')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(days)

      if (error) throw error
      return data as DailyScore[]
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const refetch = useCallback(() => { mutate() }, [mutate])

  return { scores: scores || [], loading, refetch }
}
