'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AdminReviewEntry, PersonalProgramme, PersonalFrameworkTemplate, Profile } from '@/lib/types'

export interface ReviewItem {
  review: AdminReviewEntry
  entity: PersonalProgramme | PersonalFrameworkTemplate | null
  user: Profile | null
}

export function useAdminReview() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchReviewQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch open review items
      const { data: reviews, error: reviewsError } = await supabase
        .from('admin_review_queue')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError
      if (!reviews || reviews.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      // Group by entity type
      const programmeReviews = reviews.filter(r => r.entity_type === 'programme')
      const frameworkReviews = reviews.filter(r => r.entity_type === 'framework')

      // Fetch related entities
      const programmeIds = programmeReviews.map(r => r.entity_id)
      const frameworkIds = frameworkReviews.map(r => r.entity_id)
      const userIds = Array.from(new Set(reviews.map(r => r.user_id)))

      const [programmesRes, frameworksRes, usersRes] = await Promise.all([
        programmeIds.length > 0
          ? supabase
              .from('personal_programmes')
              .select(`
                *,
                days:personal_programme_days(
                  *,
                  exercises:personal_programme_exercises(*)
                )
              `)
              .in('id', programmeIds)
          : Promise.resolve({ data: [], error: null }),
        frameworkIds.length > 0
          ? supabase
              .from('framework_templates')
              .select('*')
              .in('id', frameworkIds)
              .eq('visibility', 'personal')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('profiles')
          .select('*')
          .in('id', userIds),
      ])

      const programmesMap = new Map(
        (programmesRes.data || []).map(p => [p.id, p])
      )
      const frameworksMap = new Map(
        (frameworksRes.data || []).map(f => [f.id, f])
      )
      const usersMap = new Map(
        (usersRes.data || []).map(u => [u.id, u])
      )

      // Build review items
      const reviewItems: ReviewItem[] = reviews.map(review => {
        let entity: PersonalProgramme | PersonalFrameworkTemplate | null = null
        if (review.entity_type === 'programme') {
          entity = programmesMap.get(review.entity_id) || null
        } else if (review.entity_type === 'framework') {
          entity = frameworksMap.get(review.entity_id) || null
        }

        return {
          review,
          entity,
          user: usersMap.get(review.user_id) || null,
        }
      })

      setItems(reviewItems)
    } catch (err) {
      console.error('Error fetching review queue:', err)
      setError('Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchReviewQueue()
  }, [fetchReviewQueue])

  const approveItem = useCallback(async (reviewId: string, entityType: 'programme' | 'framework', entityId: string) => {
    try {
      // Update entity status to approved
      if (entityType === 'programme') {
        const { error } = await supabase
          .from('personal_programmes')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', entityId)
        if (error) throw error
      } else if (entityType === 'framework') {
        // For frameworks, we set is_active = true to approve
        const { error } = await supabase
          .from('framework_templates')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', entityId)
        if (error) throw error
      }

      // Update review status
      const { error: reviewError } = await supabase
        .from('admin_review_queue')
        .update({
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (reviewError) throw reviewError

      // Refresh list
      await fetchReviewQueue()
      return true
    } catch (err) {
      console.error('Error approving item:', err)
      return false
    }
  }, [supabase, fetchReviewQueue])

  const rejectItem = useCallback(async (reviewId: string, entityType: 'programme' | 'framework', entityId: string, notes?: string) => {
    try {
      // Update entity status to rejected
      if (entityType === 'programme') {
        const { error } = await supabase
          .from('personal_programmes')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', entityId)
        if (error) throw error
      } else if (entityType === 'framework') {
        // For frameworks, keep is_active = false (rejected)
        const { error } = await supabase
          .from('framework_templates')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', entityId)
        if (error) throw error
      }

      // Update review status
      const { error: reviewError } = await supabase
        .from('admin_review_queue')
        .update({
          status: 'reviewed',
          notes: notes || 'Rejected by admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (reviewError) throw reviewError

      // Refresh list
      await fetchReviewQueue()
      return true
    } catch (err) {
      console.error('Error rejecting item:', err)
      return false
    }
  }, [supabase, fetchReviewQueue])

  const dismissItem = useCallback(async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('admin_review_queue')
        .update({
          status: 'dismissed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewId)

      if (error) throw error

      await fetchReviewQueue()
      return true
    } catch (err) {
      console.error('Error dismissing item:', err)
      return false
    }
  }, [supabase, fetchReviewQueue])

  return {
    items,
    loading,
    error,
    refetch: fetchReviewQueue,
    approveItem,
    rejectItem,
    dismissItem,
  }
}
