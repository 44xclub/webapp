'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// Using native img for signed URLs as they have their own caching
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Activity, Heart, Trash2, Trophy, Zap, Shield, Award, Crown } from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { calculateDisciplineLevel } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { DisciplineBadge, ExerciseEntry, Profile, TeamDailyOverview, TeamSnapshot } from '@/lib/types'

type TabType = 'team' | 'feed'

interface FeedPost {
  id: string
  user_id: string
  block_id: string | null
  title: string
  body: string | null
  media_path: string | null
  payload: {
    workout_matrix?: ExerciseEntry[]
    duration?: number
    rpe?: number
  }
  created_at: string
  deleted_at: string | null
  user_profile?: {
    display_name: string | null
    avatar_path: string | null
    discipline_score: number
  }
  respect_count?: number
  has_respected?: boolean
}

interface TeamMemberData {
  user_id: string
  role: 'captain' | 'member'
  joined_at: string
  profiles: {
    display_name: string | null
    avatar_path: string | null
    discipline_score: number
  } | null
}

const badgeIcons: Record<DisciplineBadge, typeof Trophy> = {
  'Initiated': Shield,
  'Committed': Zap,
  'Elite': Award,
  'Forged': Trophy,
  '44-Pro': Crown,
}

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Committed': 'text-blue-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  '44-Pro': 'text-yellow-400',
}

const communityTabs = [
  { value: 'team', label: 'Team' },
  { value: 'feed', label: 'Community' },
]

export default function CommunityPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('team')
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [feedLoading, setFeedLoading] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth check
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user)
        setAuthLoading(false)
      } catch (err) {
        if (isMounted) {
          router.push('/login')
        }
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
          setAuthLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Fetch feed posts when tab changes to feed
  useEffect(() => {
    if (activeTab === 'feed' && user) {
      fetchFeedPosts()
    }
  }, [activeTab, user])

  const fetchFeedPosts = async () => {
    if (!user) return
    setFeedLoading(true)
    try {
      // Fetch posts with profile info
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_path,
            discipline_score
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      console.log('Feed posts data:', postsData)
      if (postsError) {
        console.error('Feed posts error:', postsError)
        throw postsError
      }

      // Fetch respect counts and user's respects
      const postIds = postsData?.map((p: any) => p.id) || []

      let respectCounts: Record<string, number> = {}
      let userRespects: Set<string> = new Set()

      if (postIds.length > 0) {
        // Get respect counts
        const { data: countsData } = await supabase
          .from('feed_respects')
          .select('post_id')
          .in('post_id', postIds)

        if (countsData) {
          countsData.forEach((r: any) => {
            respectCounts[r.post_id] = (respectCounts[r.post_id] || 0) + 1
          })
        }

        // Get user's respects
        const { data: userRespectsData } = await supabase
          .from('feed_respects')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id)

        if (userRespectsData) {
          userRespectsData.forEach((r: any) => userRespects.add(r.post_id))
        }
      }

      // Map posts with profile, counts, and user respect status
      const mappedPosts = (postsData || []).map((post: any) => ({
        ...post,
        user_profile: post.profiles,
        respect_count: respectCounts[post.id] || 0,
        has_respected: userRespects.has(post.id),
      }))

      setFeedPosts(mappedPosts)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setFeedLoading(false)
    }
  }

  // Data hooks
  const { profile, loading: profileLoading } = useProfile(user?.id)

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
    <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-20">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-[20px] font-semibold text-[#eef2ff] mb-3">Community</h1>
        <SegmentedControl
          tabs={communityTabs}
          activeTab={activeTab}
          onChange={(v) => setActiveTab(v as TabType)}
        />
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {activeTab === 'team' ? (
          <TeamOverview userId={user?.id} supabase={supabase} />
        ) : (
          <FeedView
            posts={feedPosts}
            loading={feedLoading}
            userId={user?.id}
            supabase={supabase}
            onRefresh={fetchFeedPosts}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
    </div>
  )
}

// Team Overview Component
function TeamOverview({ userId, supabase }: { userId: string | undefined; supabase: any }) {
  const [teamData, setTeamData] = useState<{
    team: { id: string; team_number: number } | null
    members: TeamMemberData[]
    role: 'captain' | 'member'
    dailyOverview: TeamDailyOverview | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchTeamData()
    }
  }, [userId])

  const fetchTeamData = async () => {
    setLoading(true)
    console.log('[Team] Fetching team data for userId:', userId)

    try {
      // Step 1: Fetch user's team membership (without join first to debug)
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)
        .is('left_at', null)

      console.log('[Team] Raw membership query result:', { memberships, membershipError })

      if (membershipError) {
        console.error('[Team] Membership query error:', membershipError)
        setTeamData(null)
        return
      }

      if (!memberships || memberships.length === 0) {
        console.log('[Team] No team membership found for user')
        setTeamData(null)
        return
      }

      const membership = memberships[0]
      console.log('[Team] Found membership:', membership)

      // Step 2: Fetch team details separately
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, team_number')
        .eq('id', membership.team_id)
        .single()

      console.log('[Team] Team query result:', { team, teamError })

      if (teamError || !team) {
        console.error('[Team] Team query error:', teamError)
        setTeamData(null)
        return
      }

      // Step 3: Fetch team members with profiles
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at')
        .eq('team_id', membership.team_id)
        .is('left_at', null)
        .order('role', { ascending: false })

      console.log('[Team] Members query result:', { members, membersError })

      // Step 4: Fetch profiles for members separately (more reliable than join)
      let membersWithProfiles: TeamMemberData[] = []
      if (members && members.length > 0) {
        const userIds = members.map((m: { user_id: string }) => m.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_path, discipline_score')
          .in('id', userIds)

        console.log('[Team] Profiles query result:', { profiles, profilesError })

        // Map profiles to members
        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
        membersWithProfiles = members.map((m: any) => ({
          ...m,
          profiles: profileMap.get(m.user_id) || null
        })) as TeamMemberData[]
      }

      // Step 5: Fetch latest daily overview (optional)
      const today = new Date().toISOString().split('T')[0]
      const { data: overview } = await supabase
        .from('team_daily_overviews')
        .select('*')
        .eq('team_id', membership.team_id)
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('[Team] Final team data:', { team, membersWithProfiles, overview })

      setTeamData({
        team: team,
        members: membersWithProfiles,
        role: membership.role,
        dailyOverview: overview as TeamDailyOverview | null,
      })
    } catch (err) {
      console.error('[Team] Failed to fetch team:', err)
      setTeamData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
      </div>
    )
  }

  if (!teamData?.team) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-6 border border-[rgba(255,255,255,0.06)] text-center">
        <Users className="h-12 w-12 text-[rgba(238,242,255,0.35)] mx-auto mb-4" />
        <h3 className="text-[16px] font-medium text-[#eef2ff] mb-2">No Team Yet</h3>
        <p className="text-[13px] text-[rgba(238,242,255,0.45)]">
          You&apos;ll be assigned to a team of 8 members to keep each other accountable.
        </p>
      </div>
    )
  }

  // Calculate team total score
  const teamTotalScore = teamData.members.reduce(
    (sum, m) => sum + (m.profiles?.discipline_score || 0),
    0
  )

  return (
    <div className="space-y-3">
      {/* Team Header */}
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-4 border border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-[rgba(238,242,255,0.45)]">Your Team</p>
            <p className="text-[22px] font-bold text-[#eef2ff]">Team #{teamData.team.team_number}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-[rgba(238,242,255,0.45)]">Total Score</p>
            <p className="text-[20px] font-bold text-[#eef2ff]">{teamTotalScore}</p>
          </div>
        </div>
      </div>

      {/* Daily Overview */}
      {teamData.dailyOverview && (
        <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-4 border border-[rgba(255,255,255,0.06)]">
          <p className="text-[12px] text-[rgba(238,242,255,0.45)] mb-2">Latest Snapshot ({teamData.dailyOverview.date})</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-[rgba(255,255,255,0.03)] rounded-[10px]">
              <p className="text-[18px] font-bold text-[#eef2ff]">
                {(teamData.dailyOverview.payload as TeamSnapshot)?.avg_score?.toFixed(0) || 0}
              </p>
              <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Avg Score</p>
            </div>
            <div className="text-center p-3 bg-[rgba(255,255,255,0.03)] rounded-[10px]">
              <p className="text-[18px] font-bold text-[#eef2ff]">
                {(teamData.dailyOverview.payload as TeamSnapshot)?.total_score || 0}
              </p>
              <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Total Score</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-[#eef2ff]">Team Members</h3>
          <span className="text-[12px] text-[rgba(238,242,255,0.45)]">{teamData.members.length}/8</span>
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {teamData.members.map((member) => {
            const level = calculateDisciplineLevel(member.profiles?.discipline_score || 0)
            const BadgeIcon = badgeIcons[level.badge]
            const displayName = member.profiles?.display_name || 'Member'
            const initials = displayName.slice(0, 2).toUpperCase()

            return (
              <div key={member.user_id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <span className="text-[12px] font-medium text-[rgba(238,242,255,0.52)]">
                      {initials}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#eef2ff]">
                      {displayName}
                      {member.role === 'captain' && (
                        <span className="ml-2 text-[11px] text-[#3b82f6]">(Captain)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1">
                      <BadgeIcon className={`h-3 w-3 ${badgeColors[level.badge]}`} />
                      <span className={`text-[11px] ${badgeColors[level.badge]}`}>
                        Lv.{level.level}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#eef2ff]">
                    {member.profiles?.discipline_score || 0}
                  </p>
                  <p className="text-[11px] text-[rgba(238,242,255,0.40)]">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Feed View Component
function FeedView({
  posts,
  loading,
  userId,
  supabase,
  onRefresh,
}: {
  posts: FeedPost[]
  loading: boolean
  userId: string | undefined
  supabase: any
  onRefresh: () => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleRespect = async (postId: string, hasRespected: boolean) => {
    if (!userId) return
    try {
      if (hasRespected) {
        // Remove respect
        await supabase
          .from('feed_respects')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
      } else {
        // Add respect
        await supabase
          .from('feed_respects')
          .insert({ post_id: postId, user_id: userId })
      }
      onRefresh()
    } catch (err) {
      console.error('Failed to toggle respect:', err)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!userId) return
    setDeleting(postId)
    try {
      await supabase
        .from('feed_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', userId)
      onRefresh()
    } catch (err) {
      console.error('Failed to delete post:', err)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-6 border border-[rgba(255,255,255,0.06)] text-center">
        <Activity className="h-12 w-12 text-[rgba(238,242,255,0.35)] mx-auto mb-4" />
        <h3 className="text-[16px] font-medium text-[#eef2ff] mb-2">No Posts Yet</h3>
        <p className="text-[13px] text-[rgba(238,242,255,0.45)]">
          Share your workouts and achievements to inspire others.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const displayName = post.user_profile?.display_name || 'Member'
        const initials = displayName.slice(0, 2).toUpperCase()
        const level = calculateDisciplineLevel(post.user_profile?.discipline_score || 0)
        const BadgeIcon = badgeIcons[level.badge]
        const isOwnPost = post.user_id === userId

        return (
          <div key={post.id} className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {/* Post Header */}
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <span className="text-[12px] font-medium text-[rgba(238,242,255,0.52)]">
                      {initials}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[#eef2ff]">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <BadgeIcon className={`h-3 w-3 ${badgeColors[level.badge]}`} />
                        <span className={`text-[11px] ${badgeColors[level.badge]}`}>Lv.{level.level}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[rgba(238,242,255,0.40)]">
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {isOwnPost && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="p-2 text-[rgba(238,242,255,0.40)] hover:text-rose-400 transition-colors"
                  >
                    {deleting === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 py-3">
              <h3 className="text-[14px] font-medium text-[#eef2ff] mb-2">{post.title}</h3>
              {post.body && (
                <p className="text-[13px] text-[rgba(238,242,255,0.52)] mb-3">{post.body}</p>
              )}

              {/* Workout Matrix */}
              {post.payload?.workout_matrix && post.payload.workout_matrix.length > 0 && (
                <div className="mt-3 bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3">
                  <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2">Workout Breakdown</p>
                  <div className="space-y-2">
                    {post.payload.workout_matrix.map((exercise: any, idx: number) => {
                      const setsCount = Array.isArray(exercise.sets) ? exercise.sets.length : exercise.sets
                      return (
                        <div key={idx} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#eef2ff]">{exercise.exercise || 'Exercise'}</span>
                          <div className="flex items-center gap-2 text-[rgba(238,242,255,0.45)]">
                            {setsCount && <span>{setsCount} sets</span>}
                            {exercise.reps && <span>× {exercise.reps}</span>}
                            {exercise.weight && <span>@ {exercise.weight}kg</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {post.payload.duration && (
                    <p className="text-[11px] text-[rgba(238,242,255,0.40)] mt-2">
                      Duration: {post.payload.duration} min
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-4">
              <button
                onClick={() => handleRespect(post.id, post.has_respected || false)}
                className={`flex items-center gap-2 text-[13px] transition-colors ${
                  post.has_respected
                    ? 'text-red-500'
                    : 'text-[rgba(238,242,255,0.45)] hover:text-red-500'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${post.has_respected ? 'fill-current' : ''}`}
                />
                <span>{post.respect_count || 0} Respect</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
