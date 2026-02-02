'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

export function useCommunityChallenge(userId: string | undefined) {
  const [challenge, setChallenge] = useState<CommunityChallenge | null>(null)
  const [todayBlock, setTodayBlock] = useState<Block | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchChallenge = useCallback(async () => {
    setLoading(true)
    try {
      const today = formatDateForApi(new Date())

      // Fetch active challenge (today is between start_date and end_date)
      const { data: challengeData, error: challengeError } = await supabase
        .from('community_challenges')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1)
        .single()

      if (challengeError && challengeError.code !== 'PGRST116') {
        console.error('Failed to fetch challenge:', challengeError)
      }

      setChallenge(challengeData as CommunityChallenge | null)

      // Fetch today's challenge block if user is logged in
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

        setTodayBlock(blockData as Block | null)
      }
    } catch (err) {
      console.error('Failed to fetch challenge data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchChallenge()
  }, [fetchChallenge])

  const logChallenge = useCallback(async () => {
    if (!userId || !challenge) throw new Error('Cannot log challenge')

    const today = formatDateForApi(new Date())
    const now = new Date()
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('blocks')
      .insert({
        user_id: userId,
        date: today,
        start_time: startTime,
        block_type: 'challenge',
        title: challenge.title,
        challenge_id: challenge.id,
        payload: { challenge_id: challenge.id },
      })
      .select()
      .single()

    if (error) throw error

    setTodayBlock(data as Block)
    return data as Block
  }, [userId, challenge, supabase])

  return {
    challenge,
    todayBlock,
    loading,
    logChallenge,
    refetch: fetchChallenge,
  }
}

export function useFrameworks(userId: string | undefined) {
  const [frameworks, setFrameworks] = useState<FrameworkTemplate[]>([])
  const [activeFramework, setActiveFramework] = useState<UserFramework | null>(null)
  const [todaySubmission, setTodaySubmission] = useState<DailyFrameworkSubmission | null>(null)
  const [todayItems, setTodayItems] = useState<DailyFrameworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchFrameworks = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all active framework templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('framework_templates')
        .select('*')
        .eq('is_active', true)
        .order('title')

      if (templatesError) throw templatesError

      setFrameworks(templatesData as FrameworkTemplate[])

      // Fetch user's active framework
      if (userId) {
        const { data: userFrameworkData } = await supabase
          .from('user_frameworks')
          .select('*, framework_template:framework_templates(*)')
          .eq('user_id', userId)
          .single()

        setActiveFramework(userFrameworkData as UserFramework | null)

        const today = formatDateForApi(new Date())

        // Ensure daily framework items exist (call RPC to hydrate)
        if (userFrameworkData) {
          await supabase.rpc('fn_ensure_daily_framework_items', { p_date: today })
        }

        // Fetch today's submission
        const { data: submissionData } = await supabase
          .from('daily_framework_submissions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        setTodaySubmission(submissionData as DailyFrameworkSubmission | null)

        // Fetch today's framework items for the active framework only
        if (userFrameworkData?.framework_template_id) {
          const { data: itemsData } = await supabase
            .from('daily_framework_items')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .eq('framework_template_id', userFrameworkData.framework_template_id)

          setTodayItems((itemsData as DailyFrameworkItem[]) || [])
        } else {
          setTodayItems([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch frameworks:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchFrameworks()
  }, [fetchFrameworks])

  const activateFramework = useCallback(
    async (frameworkTemplateId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_frameworks')
        .upsert({
          user_id: userId,
          framework_template_id: frameworkTemplateId,
          activated_at: new Date().toISOString(),
        })
        .select('*, framework_template:framework_templates(*)')
        .single()

      if (error) throw error

      // Ensure daily framework items exist for today
      const today = formatDateForApi(new Date())
      await supabase.rpc('fn_ensure_daily_framework_items', { p_date: today })

      // Fetch fresh items for the new framework
      const { data: itemsData } = await supabase
        .from('daily_framework_items')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('framework_template_id', frameworkTemplateId)

      setTodayItems((itemsData as DailyFrameworkItem[]) || [])
      setActiveFramework(data as UserFramework)
      return data as UserFramework
    },
    [userId, supabase]
  )

  const submitDailyStatus = useCallback(
    async (status: FrameworkSubmissionStatus) => {
      if (!userId) throw new Error('Not authenticated')

      const today = formatDateForApi(new Date())

      const { data, error } = await supabase
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

      setTodaySubmission(data as DailyFrameworkSubmission)
      return data as DailyFrameworkSubmission
    },
    [userId, supabase]
  )

  // Toggle a framework criterion item
  const toggleFrameworkItem = useCallback(
    async (criteriaKey: string, checked: boolean) => {
      if (!userId) throw new Error('Not authenticated')
      if (!activeFramework?.framework_template_id) throw new Error('No active framework')

      const today = formatDateForApi(new Date())

      const { data, error } = await supabase
        .from('daily_framework_items')
        .upsert(
          {
            user_id: userId,
            date: today,
            framework_template_id: activeFramework.framework_template_id,
            criteria_key: criteriaKey,
            checked,
            checked_at: checked ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,date,framework_template_id,criteria_key' }
        )
        .select()
        .single()

      if (error) throw error

      // Update local state
      setTodayItems((prev) => {
        const existing = prev.find((item) => item.criteria_key === criteriaKey)
        if (existing) {
          return prev.map((item) =>
            item.criteria_key === criteriaKey
              ? { ...item, checked, checked_at: checked ? new Date().toISOString() : null }
              : item
          )
        }
        return [...prev, data as DailyFrameworkItem]
      })

      return data as DailyFrameworkItem
    },
    [userId, activeFramework, supabase]
  )

  // Deactivate framework
  const deactivateFramework = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('user_frameworks')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    setActiveFramework(null)
    setTodayItems([])
  }, [userId, supabase])

  // Calculate completion count
  const completionCount = useMemo(() => {
    if (!activeFramework?.framework_template?.criteria) return { completed: 0, total: 0 }
    const criteria = activeFramework.framework_template.criteria as FrameworkCriteria
    // Support both criteria.items array and criteria as direct array
    const items = Array.isArray(criteria) ? criteria : (criteria.items || [])
    const total = items.length
    const completed = todayItems.filter((item) => item.checked).length
    return { completed, total }
  }, [activeFramework, todayItems])

  return {
    frameworks,
    activeFramework,
    todaySubmission,
    todayItems,
    completionCount,
    loading,
    activateFramework,
    deactivateFramework,
    submitDailyStatus,
    toggleFrameworkItem,
    refetch: fetchFrameworks,
  }
}

export function useDailyScores(userId: string | undefined, days: number = 7) {
  const [scores, setScores] = useState<DailyScore[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchScores = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_scores')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(days)

      if (error) throw error

      setScores(data as DailyScore[])
    } catch (err) {
      console.error('Failed to fetch daily scores:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, days, supabase])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  return { scores, loading, refetch: fetchScores }
}
