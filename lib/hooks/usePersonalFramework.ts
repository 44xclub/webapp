'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FrameworkTemplate, FrameworkCriteriaItem, UserFramework } from '@/lib/types'

interface PersonalFramework extends FrameworkTemplate {
  visibility: 'personal'
  owner_user_id: string
}

interface UsePersonalFrameworkOptions {
  userId?: string
}

interface UsePersonalFrameworkReturn {
  personalFramework: PersonalFramework | null
  activeFramework: UserFramework | null
  loading: boolean
  error: string | null
  createPersonalFramework: (data: CreateFrameworkData) => Promise<PersonalFramework | null>
  updatePersonalFramework: (id: string, data: UpdateFrameworkData) => Promise<boolean>
  deletePersonalFramework: (id: string) => Promise<boolean>
  activateFramework: (templateId: string) => Promise<boolean>
  refetch: () => Promise<void>
}

interface CreateFrameworkData {
  title: string
  description?: string
  criteria: FrameworkCriteriaItem[]
}

interface UpdateFrameworkData {
  title?: string
  description?: string
  criteria?: FrameworkCriteriaItem[]
}

export function usePersonalFramework(
  options: UsePersonalFrameworkOptions = {}
): UsePersonalFrameworkReturn {
  const { userId } = options
  const [personalFramework, setPersonalFramework] = useState<PersonalFramework | null>(null)
  const [activeFramework, setActiveFramework] = useState<UserFramework | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    if (!userId) {
      setPersonalFramework(null)
      setActiveFramework(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch personal framework (user's own)
      const { data: frameworks, error: frameworkError } = await supabase
        .from('framework_templates')
        .select('*')
        .eq('visibility', 'personal')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (frameworkError) throw frameworkError

      setPersonalFramework(frameworks?.[0] as PersonalFramework || null)

      // Fetch active framework
      const { data: active, error: activeError } = await supabase
        .from('user_frameworks')
        .select('*, framework_template:framework_templates(*)')
        .eq('user_id', userId)
        .maybeSingle()

      if (activeError) throw activeError

      setActiveFramework(active as UserFramework || null)
    } catch (err) {
      console.error('[usePersonalFramework] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch framework')
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create a personal framework
  const createPersonalFramework = useCallback(
    async (data: CreateFrameworkData): Promise<PersonalFramework | null> => {
      if (!userId) return null

      // Validate max 5 criteria
      if (data.criteria.length > 5) {
        setError('Maximum 5 non-negotiables allowed')
        return null
      }

      try {
        const { data: framework, error } = await supabase
          .from('framework_templates')
          .insert({
            title: data.title,
            description: data.description || null,
            criteria: { items: data.criteria },
            visibility: 'personal',
            owner_user_id: userId,
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        // Add to admin review queue (silent notification)
        await supabase.from('admin_review_queue').insert({
          entity_type: 'framework',
          entity_id: framework.id,
          user_id: userId,
        })

        await fetchData()
        return framework as PersonalFramework
      } catch (err) {
        console.error('[usePersonalFramework] Create error:', err)
        setError(err instanceof Error ? err.message : 'Failed to create framework')
        return null
      }
    },
    [userId, supabase, fetchData]
  )

  // Update a personal framework
  const updatePersonalFramework = useCallback(
    async (id: string, data: UpdateFrameworkData): Promise<boolean> => {
      // Validate max 5 criteria if updating
      if (data.criteria && data.criteria.length > 5) {
        setError('Maximum 5 non-negotiables allowed')
        return false
      }

      try {
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.title !== undefined) updateData.title = data.title
        if (data.description !== undefined) updateData.description = data.description
        if (data.criteria !== undefined) updateData.criteria = { items: data.criteria }

        const { error } = await supabase
          .from('framework_templates')
          .update(updateData)
          .eq('id', id)
          .eq('owner_user_id', userId)

        if (error) throw error

        await fetchData()
        return true
      } catch (err) {
        console.error('[usePersonalFramework] Update error:', err)
        setError(err instanceof Error ? err.message : 'Failed to update framework')
        return false
      }
    },
    [userId, supabase, fetchData]
  )

  // Delete a personal framework
  const deletePersonalFramework = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('framework_templates')
          .delete()
          .eq('id', id)
          .eq('owner_user_id', userId)

        if (error) throw error

        await fetchData()
        return true
      } catch (err) {
        console.error('[usePersonalFramework] Delete error:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete framework')
        return false
      }
    },
    [userId, supabase, fetchData]
  )

  // Activate a framework (upsert user_frameworks)
  const activateFramework = useCallback(
    async (templateId: string): Promise<boolean> => {
      if (!userId) return false

      try {
        const { error } = await supabase
          .from('user_frameworks')
          .upsert({
            user_id: userId,
            framework_template_id: templateId,
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          })

        if (error) throw error

        await fetchData()
        return true
      } catch (err) {
        console.error('[usePersonalFramework] Activate error:', err)
        setError(err instanceof Error ? err.message : 'Failed to activate framework')
        return false
      }
    },
    [userId, supabase, fetchData]
  )

  return {
    personalFramework,
    activeFramework,
    loading,
    error,
    createPersonalFramework,
    updatePersonalFramework,
    deletePersonalFramework,
    activateFramework,
    refetch: fetchData,
  }
}
