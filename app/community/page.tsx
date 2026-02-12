'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Activity, Shield, Target, Flame, Swords, Award, Anvil, Rocket, Crown, ChevronDown, ChevronRight, Calendar, RefreshCw } from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FeedPostCard, FeedPost } from '@/components/feed/FeedPostCard'
import { calculateDisciplineLevel } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { DisciplineBadge, TeamDailyOverview, TeamSnapshot } from '@/lib/types'

type TabType = 'team' | 'feed'

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

// Badge icons for each tier
const badgeIcons: Record<DisciplineBadge, typeof Shield> = {
  'Initiated': Shield,
  'Aligned': Target,
  'Committed': Flame,
  'Disciplined': Swords,
  'Elite': Award,
  'Forged': Anvil,
  'Vanguard': Rocket,
  '44 Pro': Crown,
}

// Badge colors for each tier
const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Aligned': 'text-emerald-400',
  'Committed': 'text-blue-400',
  'Disciplined': 'text-indigo-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  'Vanguard': 'text-rose-400',
  '44 Pro': 'text-purple-400',
}

// Roman numerals for badge levels
const romanNumerals = ['I', 'II', 'III', 'IV', 'V']

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
      // Fetch posts first (without join - join doesn't work with auth.users FK)
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      console.log('[Feed] Posts data:', postsData)
      if (postsError) {
        console.error('[Feed] Posts error:', postsError)
        throw postsError
      }

      // Fetch profiles separately for all post authors
      let postsWithProfiles = postsData || []
      if (postsData && postsData.length > 0) {
        const userIds = Array.from(new Set(postsData.map((p: any) => p.user_id)))
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_path, discipline_score')
          .in('id', userIds)

        console.log('[Feed] Profiles for posts:', { profiles, profilesError })

        if (profiles) {
          const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
          postsWithProfiles = postsData.map((post: any) => ({
            ...post,
            profiles: profileMap.get(post.user_id) || null
          }))
        }
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
      const mappedPosts = postsWithProfiles.map((post: any) => ({
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
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Tab Navigation - sticky under header */}
      <div className="sticky top-0 z-40 bg-[#07090d] px-4 pt-3 pb-2">
        <SegmentedControl
          tabs={communityTabs}
          activeTab={activeTab}
          onChange={(v) => setActiveTab(v as TabType)}
        />
      </div>

      {/* Main Content */}
      <main className="px-4 pt-2 pb-4 space-y-5">
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
  )
}

// Team state: 'loading' | 'unassigned' | 'error' | 'loaded'
type TeamState = 'loading' | 'unassigned' | 'error' | 'loaded'

// Team Overview Component
function TeamOverview({ userId, supabase }: { userId: string | undefined; supabase: any }) {
  const [teamData, setTeamData] = useState<{
    team: { id: string; team_number: number } | null
    members: TeamMemberData[]
    role: 'captain' | 'member'
    dailyOverviews: TeamDailyOverview[]
  } | null>(null)
  const [teamState, setTeamState] = useState<TeamState>('loading')
  const [membersExpanded, setMembersExpanded] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchTeamData()
    }
  }, [userId])

  const fetchTeamData = async () => {
    setTeamState('loading')

    try {
      // Step 1: Fetch user's team membership
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)
        .is('left_at', null)

      // No membership = truly unassigned
      if (!memberships || memberships.length === 0) {
        if (membershipError) {
          console.error('[Team] Membership query error:', membershipError)
        }
        setTeamData(null)
        setTeamState('unassigned')
        return
      }

      const membership = memberships[0]

      // Step 2: Fetch team details - if this fails, user IS assigned but data unavailable
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, team_number')
        .eq('id', membership.team_id)
        .single()

      if (teamError || !team) {
        console.error('[Team] Team data error (user is assigned but data unavailable):', teamError)
        setTeamData(null)
        setTeamState('error')
        return
      }

      // Step 3: Fetch team members
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at')
        .eq('team_id', membership.team_id)
        .is('left_at', null)
        .order('role', { ascending: false })

      // Step 4: Fetch profiles for members
      let membersWithProfiles: TeamMemberData[] = []
      if (members && members.length > 0) {
        const userIds = members.map((m: { user_id: string }) => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_path, discipline_score')
          .in('id', userIds)

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
        membersWithProfiles = members.map((m: any) => ({
          ...m,
          profiles: profileMap.get(m.user_id) || null
        })) as TeamMemberData[]
      }

      // Step 5: Fetch daily overviews (multiple, for the feed)
      const { data: overviews } = await supabase
        .from('team_daily_overviews')
        .select('*')
        .eq('team_id', membership.team_id)
        .order('date', { ascending: false })
        .limit(14) // Last 2 weeks

      setTeamData({
        team: team,
        members: membersWithProfiles,
        role: membership.role,
        dailyOverviews: (overviews || []) as TeamDailyOverview[],
      })
      setTeamState('loaded')
    } catch (err) {
      console.error('[Team] Unexpected error:', err)
      setTeamData(null)
      setTeamState('error')
    }
  }

  // State 1: Loading skeleton with message
  if (teamState === 'loading') {
    return (
      <div className="section-card flex flex-col items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)] mb-3" />
        <p className="text-[13px] text-[var(--text-tertiary)]">Checking your team...</p>
      </div>
    )
  }

  // State 2: Error - user IS assigned but team data unavailable (RLS / network)
  if (teamState === 'error') {
    return (
      <div className="section-card text-center py-10">
        <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Team Data Unavailable</h3>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-4 max-w-[240px] mx-auto">
          We couldn&apos;t load your team right now. This may be temporary.
        </p>
        <button
          onClick={fetchTeamData}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[var(--radius-button)] hover:border-[var(--border-emphasis)] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  // State 3: Truly unassigned - no team_members row exists
  if (teamState === 'unassigned' || !teamData?.team) {
    return (
      <div className="section-card text-center py-10">
        <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">No Team Yet</h3>
        <p className="text-[13px] text-[var(--text-tertiary)] max-w-[240px] mx-auto">
          You&apos;ll be assigned to a team of 8 to keep each other accountable.
        </p>
      </div>
    )
  }

  const teamTotalScore = teamData.members.reduce(
    (sum, m) => sum + (m.profiles?.discipline_score || 0),
    0
  )

  return (
    <div className="space-y-3">
      {/* Team Summary Card */}
      <div className="section-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-micro">Your Team</p>
            <p className="text-[22px] font-bold text-[var(--text-primary)]">Team #{teamData.team.team_number}</p>
          </div>
          <div className="text-right">
            <p className="text-micro">Total Score</p>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">{teamTotalScore}</p>
          </div>
        </div>
      </div>

      {/* Collapsible Team Members */}
      <div className="section-card p-0 overflow-hidden">
        <button
          onClick={() => setMembersExpanded(!membersExpanded)}
          className="w-full px-[var(--space-card)] py-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-label">Team Members</h3>
            <span className="text-meta">{teamData.members.length}/8</span>
          </div>
          {membersExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          )}
        </button>

        {membersExpanded && (
          <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {teamData.members.map((member) => {
              const level = calculateDisciplineLevel(member.profiles?.discipline_score || 0)
              const BadgeIcon = badgeIcons[level.badge]
              const badgeColor = badgeColors[level.badge]
              const badgeDisplay = `${level.badge} ${romanNumerals[level.badgeLevel - 1] || 'I'}`
              const displayName = member.profiles?.display_name || 'Member'
              const initials = displayName.slice(0, 2).toUpperCase()

              return (
                <div key={member.user_id} className="px-[var(--space-card)] py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                      <span className="text-meta">
                        {initials}
                      </span>
                    </div>
                    <div>
                      <p className="text-meta text-[var(--text-primary)]">
                        {displayName}
                        {member.role === 'captain' && (
                          <span className="ml-2 text-micro normal-case text-[var(--accent-blue)]">(Captain)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1">
                        <BadgeIcon className={`h-3 w-3 ${badgeColor}`} />
                        <span className={`text-micro normal-case ${badgeColor}`}>
                          {badgeDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-meta font-bold text-[var(--text-primary)]">
                      {member.profiles?.discipline_score || 0}
                    </p>
                    <p className="text-micro">pts</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Daily Overviews Feed */}
      <div className="space-y-2">
        <h3 className="text-label px-1">Daily Overviews</h3>

        {teamData.dailyOverviews.length === 0 ? (
          <div className="section-card text-center py-8">
            <Calendar className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              No daily overviews yet. Check back after the first day resolves.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamData.dailyOverviews.map((overview) => (
              <DailyOverviewCard
                key={overview.id}
                overview={overview}
                members={teamData.members}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Daily Overview Card (chat/feed style)
function DailyOverviewCard({
  overview,
  members,
}: {
  overview: TeamDailyOverview
  members: TeamMemberData[]
}) {
  const payload = overview.payload as TeamSnapshot
  const date = new Date(overview.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const resolvedTime = overview.cutoff_at
    ? new Date(overview.cutoff_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  // Map member snapshots to profiles for display names
  const memberSnapshots = payload?.members || []

  return (
    <div className="section-card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-[var(--space-card)] py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--accent-blue)]" />
          <span className="text-meta text-[var(--text-primary)]">{formattedDate}</span>
        </div>
        {resolvedTime && (
          <span className="text-micro">
            Resolved at {resolvedTime}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      {payload && (
        <div className="px-[var(--space-card)] py-2 border-b border-[var(--border-subtle)] flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-micro">Avg:</span>
            <span className="text-meta text-[var(--text-primary)]">
              {payload.avg_score?.toFixed(0) || 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-micro">Total:</span>
            <span className="text-meta text-[var(--text-primary)]">
              {payload.total_score || 0}
            </span>
          </div>
        </div>
      )}

      {/* Member Summaries */}
      <div className="px-[var(--space-card)] py-3 space-y-2">
        {memberSnapshots.length > 0 ? (
          memberSnapshots.map((snapshot: any, idx: number) => {
            const memberProfile = members.find((m) => m.user_id === snapshot.user_id)
            const displayName = snapshot.display_name || memberProfile?.profiles?.display_name || 'Member'
            const delta = snapshot.daily_delta || 0
            const status = snapshot.framework_status

            return (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-meta text-[var(--text-primary)]">{displayName}</span>
                  <span className="text-meta">
                    {' — '}
                    {status === 'complete' && 'Completed all blocks'}
                    {status === 'partial' && 'Partial completion'}
                    {status === 'zero' && 'No blocks completed'}
                    {!status && `Score: ${snapshot.discipline_score || 0}`}
                  </span>
                </div>
                <span className={`text-meta font-medium flex-shrink-0 ${
                  delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-[var(--text-muted)]'
                }`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              </div>
            )
          })
        ) : (
          <p className="text-meta">
            No member data available for this day.
          </p>
        )}
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
        await supabase
          .from('feed_respects')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
      } else {
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
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="section-card text-center py-10">
        <Activity className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">No Posts Yet</h3>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Share your workouts and achievements to inspire others.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          userId={userId}
          onRespect={handleRespect}
          onDelete={handleDelete}
          deleting={deleting === post.id}
        />
      ))}
    </div>
  )
}
