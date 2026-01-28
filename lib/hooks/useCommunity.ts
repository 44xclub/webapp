'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForApi } from '@/lib/date'
import type {
  Team,
  TeamMember,
  TeamDailyOverview,
  FeedPost,
  Profile,
} from '@/lib/types'

export function useTeam(userId: string | undefined) {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [latestOverview, setLatestOverview] = useState<TeamDailyOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTeam = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Find user's team membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single()

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw membershipError
      }

      if (!membershipData) {
        setTeam(null)
        setMembers([])
        setLatestOverview(null)
        setLoading(false)
        return
      }

      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', membershipData.team_id)
        .single()

      if (teamError) throw teamError

      setTeam(teamData as Team)

      // Fetch all team members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', membershipData.team_id)
        .order('joined_at')

      if (membersError) throw membersError

      setMembers(membersData as TeamMember[])

      // Fetch latest daily overview
      const { data: overviewData } = await supabase
        .from('team_daily_overviews')
        .select('*')
        .eq('team_id', membershipData.team_id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      setLatestOverview(overviewData as TeamDailyOverview | null)
    } catch (err) {
      console.error('Failed to fetch team data:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  return { team, members, latestOverview, loading, refetch: fetchTeam }
}

export function useFeed(userId: string | undefined) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch posts with profile data
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*, profile:profiles(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (postsError) throw postsError

      // Get respect counts for each post
      const postIds = postsData.map(p => p.id)

      if (postIds.length > 0) {
        // Get counts
        const { data: respectCounts } = await supabase
          .from('feed_respects')
          .select('post_id')
          .in('post_id', postIds)

        // Get user's respects if logged in
        let userRespects: string[] = []
        if (userId) {
          const { data: userRespectData } = await supabase
            .from('feed_respects')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds)

          userRespects = (userRespectData || []).map(r => r.post_id)
        }

        // Map counts to posts
        const countMap = new Map<string, number>()
        ;(respectCounts || []).forEach(r => {
          countMap.set(r.post_id, (countMap.get(r.post_id) || 0) + 1)
        })

        const postsWithCounts = postsData.map(post => ({
          ...post,
          respects_count: countMap.get(post.id) || 0,
          user_has_respected: userRespects.includes(post.id),
        }))

        setPosts(postsWithCounts as FeedPost[])
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const respectPost = useCallback(
    async (postId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase.from('feed_respects').insert({
        post_id: postId,
        user_id: userId,
      })

      if (error) throw error

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                respects_count: (post.respects_count || 0) + 1,
                user_has_respected: true,
              }
            : post
        )
      )
    },
    [userId, supabase]
  )

  const removeRespect = useCallback(
    async (postId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feed_respects')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      if (error) throw error

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                respects_count: Math.max((post.respects_count || 0) - 1, 0),
                user_has_respected: false,
              }
            : post
        )
      )
    },
    [userId, supabase]
  )

  const deletePost = useCallback(
    async (postId: string) => {
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('feed_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', userId)

      if (error) throw error

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId))
    },
    [userId, supabase]
  )

  return {
    posts,
    loading,
    respectPost,
    removeRespect,
    deletePost,
    refetch: fetchPosts,
  }
}
