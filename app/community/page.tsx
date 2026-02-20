'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Activity, Shield, Target, Flame, Swords, Award, Anvil, Rocket, Crown, ChevronDown, ChevronRight, Calendar, RefreshCw } from 'lucide-react'
import { useAuth, useProfile } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FeedPostCard, FeedPost } from '@/components/feed/FeedPostCard'
import { FeedSkeleton, TeamCardSkeleton } from '@/components/ui/Skeletons'
import { calculateDisciplineLevel } from '@/lib/types'
import { parseDateOnly } from '@/lib/date'
import type { DisciplineBadge, TeamDailyOverview, TeamSnapshot, TeamSnapshotHighlight, TeamSnapshotFlag } from '@/lib/types'

type TabType = 'team' | 'feed'

interface TeamMemberData {
  user_id: string
  role: 'captain' | 'member'
  joined_at: string
  profiles: {
    display_name: string | null
    avatar_path: string | null
    avatar_url: string | null
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
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('team')
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedLoaded, setFeedLoaded] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Fetch feed posts when tab changes to feed (only once, then use cache)
  useEffect(() => {
    if (activeTab === 'feed' && user && !feedLoaded) {
      fetchFeedPosts()
    }
  }, [activeTab, user])

  const fetchFeedPosts = async () => {
    if (!user) return
    setFeedLoading(true)
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (postsError) throw postsError

      let postsWithProfiles = postsData || []
      if (postsData && postsData.length > 0) {
        const userIds = Array.from(new Set(postsData.map((p: any) => p.user_id)))
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_path, discipline_score')
          .in('id', userIds)

        if (profiles) {
          const avatarPaths = profiles.filter((p: any) => p.avatar_path).map((p: any) => p.avatar_path)
          const avatarUrlMap = new Map<string, string>()
          if (avatarPaths.length > 0) {
            const { data: signedData } = await supabase.storage.from('avatars').createSignedUrls(avatarPaths, 3600)
            if (signedData) {
              signedData.forEach((item: any) => {
                if (item.signedUrl && item.path) {
                  avatarUrlMap.set(item.path, item.signedUrl)
                }
              })
            }
          }

          const profileMap = new Map(profiles.map((p: any) => [p.id, {
            ...p,
            avatar_url: p.avatar_path ? (avatarUrlMap.get(p.avatar_path) || null) : null,
          }]))
          postsWithProfiles = postsData.map((post: any) => ({
            ...post,
            profiles: profileMap.get(post.user_id) || null
          }))
        }
      }

      const postIds = postsData?.map((p: any) => p.id) || []

      let respectCounts: Record<string, number> = {}
      let userRespects: Set<string> = new Set()

      if (postIds.length > 0) {
        const { data: countsData } = await supabase
          .from('feed_respects')
          .select('post_id')
          .in('post_id', postIds)

        if (countsData) {
          countsData.forEach((r: any) => {
            respectCounts[r.post_id] = (respectCounts[r.post_id] || 0) + 1
          })
        }

        const { data: userRespectsData } = await supabase
          .from('feed_respects')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', user.id)

        if (userRespectsData) {
          userRespectsData.forEach((r: any) => userRespects.add(r.post_id))
        }
      }

      const mappedPosts = postsWithProfiles.map((post: any) => ({
        ...post,
        user_profile: post.profiles,
        respect_count: respectCounts[post.id] || 0,
        has_respected: userRespects.has(post.id),
      }))

      setFeedPosts(mappedPosts)
      setFeedLoaded(true)
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    } finally {
      setFeedLoading(false)
    }
  }

  // Data hooks
  const { profile, loading: profileLoading, avatarUrl } = useProfile(user?.id)

  if (authLoading || !user) {
    return (
      <div className="app-shell">
        <div className="min-h-app flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-app content-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} avatarUrl={avatarUrl} />

      {/* Tab Navigation - sticky under header */}
      <div className="sticky top-0 z-40 bg-[rgba(7,9,13,0.92)] backdrop-blur-[12px] px-4 pt-1.5 pb-1">
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
            setFeedPosts={setFeedPosts}
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

      // Query error (e.g. RLS 500) — show error/retry, not "No Team Yet"
      if (membershipError) {
        console.error('[Team] Membership query error:', membershipError)
        setTeamData(null)
        setTeamState('error')
        return
      }

      // No membership = truly unassigned
      if (!memberships || memberships.length === 0) {
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

        // Resolve signed avatar URLs for team members
        const memberAvatarPaths = (profiles || []).filter((p: any) => p.avatar_path).map((p: any) => p.avatar_path)
        const memberAvatarUrlMap = new Map<string, string>()
        if (memberAvatarPaths.length > 0) {
          const { data: signedData } = await supabase.storage.from('avatars').createSignedUrls(memberAvatarPaths, 3600)
          if (signedData) {
            signedData.forEach((item: any) => {
              if (item.signedUrl && item.path) {
                memberAvatarUrlMap.set(item.path, item.signedUrl)
              }
            })
          }
        }

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, {
          ...p,
          avatar_url: p.avatar_path ? (memberAvatarUrlMap.get(p.avatar_path) || null) : null,
        }]))
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

  // State 1: Loading skeleton
  if (teamState === 'loading') {
    return <TeamCardSkeleton />
  }

  // State 2: Error - user IS assigned but team data unavailable (RLS / network)
  if (teamState === 'error') {
    return (
      <div className="section-card text-center py-8">
        <Users className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">Team Data Unavailable</h3>
        <p className="text-[12px] text-[var(--text-tertiary)] mb-3 max-w-[220px] mx-auto">
          We couldn&apos;t load your team right now.
        </p>
        <button
          onClick={fetchTeamData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border-default)] rounded-[var(--radius-button)] hover:border-[var(--border-emphasis)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  // State 3: Truly unassigned - no team_members row exists
  if (teamState === 'unassigned' || !teamData?.team) {
    return (
      <div className="section-card text-center py-6">
        <Users className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">No Team Yet</h3>
        <p className="text-[12px] text-[var(--text-tertiary)] max-w-[220px] mx-auto">
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
      {/* Compact Team Card — single card with team info + members */}
      <div className="section-card p-0 overflow-hidden">
        {/* Header row — clickable to toggle members */}
        <button
          onClick={() => setMembersExpanded(!membersExpanded)}
          className="w-full px-[var(--space-card)] py-2.5 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight text-left">
                Team #{teamData.team.team_number}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] leading-tight mt-0.5">
                {teamData.members.length}/8 members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[16px] font-bold text-[var(--text-primary)] leading-tight tabular-nums">
                {teamTotalScore}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5 uppercase tracking-wider">
                Total score
              </p>
            </div>
            {membersExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            )}
          </div>
        </button>

        {/* Expandable member list */}
        {membersExpanded && (
          <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {teamData.members.map((member) => {
              const level = calculateDisciplineLevel(member.profiles?.discipline_score || 0)
              const BadgeIcon = badgeIcons[level.badge]
              const badgeColor = badgeColors[level.badge]
              const badgeDisplay = `${level.badge} ${romanNumerals[level.badgeLevel - 1] || 'I'}`
              const displayName = member.profiles?.display_name || 'Member'
              const initials = displayName.slice(0, 2).toUpperCase()
              const memberAvatarUrl = member.profiles?.avatar_url || null

              return (
                <div key={member.user_id} className="px-[var(--space-card)] py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {memberAvatarUrl ? (
                        <img src={memberAvatarUrl} alt={displayName} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] text-[var(--text-primary)] leading-tight">
                        {displayName}
                        {member.role === 'captain' && (
                          <span className="ml-1.5 text-[10px] text-[var(--accent-blue)]">Capt</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1">
                        <BadgeIcon className={`h-2.5 w-2.5 ${badgeColor}`} />
                        <span className={`text-[10px] ${badgeColor}`}>
                          {badgeDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                    {member.profiles?.discipline_score || 0} <span className="text-[10px] text-[var(--text-muted)]">pts</span>
                  </p>
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
          <div className="section-card text-center py-5">
            <Calendar className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-50" />
            <p className="text-[12px] text-[var(--text-secondary)]">
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

// Daily Overview Card (compact summary format)
function DailyOverviewCard({
  overview,
  members,
}: {
  overview: TeamDailyOverview
  members: TeamMemberData[]
}) {
  const payload = overview.payload as TeamSnapshot
  const date = parseDateOnly(overview.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  // New format: summary + highlights + flags
  const summary = payload?.summary
  const highlights = payload?.highlights || []
  const flags = payload?.flags || []

  // Fallback for legacy payloads without summary
  const hasNewFormat = !!summary

  // Legacy member snapshots (fallback)
  const memberSnapshots = payload?.members || []

  return (
    <div className="section-card p-0 overflow-hidden">
      {/* Header row: date + summary stats */}
      <div className="px-[var(--space-card)] py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
          <span className="text-meta text-[var(--text-primary)]">{formattedDate}</span>
        </div>
        {hasNewFormat ? (
          <div className="flex items-center gap-3">
            <span className="text-meta font-medium text-emerald-400">
              +{summary.team_delta} pts
            </span>
            <span className="text-micro">
              {summary.executed} executed
            </span>
          </div>
        ) : (
          <span className="text-meta text-[var(--text-primary)]">
            {payload?.total_score || 0} pts
          </span>
        )}
      </div>

      {/* Avg execution subtext */}
      {hasNewFormat && (
        <div className="px-[var(--space-card)] py-1.5 border-b border-[var(--border-subtle)]">
          <span className="text-micro">
            Avg execution {Math.round((summary.avg_execution || 0) * 100)}%
          </span>
        </div>
      )}

      {/* Two columns: Highlights + Flags (new format) */}
      {hasNewFormat && (highlights.length > 0 || flags.length > 0) && (
        <div className="px-[var(--space-card)] py-2.5 flex gap-4">
          {/* Top performers */}
          {highlights.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-1">Top</p>
              {highlights.map((h: TeamSnapshotHighlight, i: number) => (
                <div key={i} className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-meta text-[var(--text-primary)] truncate">{h.name}</span>
                  <span className="text-meta font-medium text-emerald-400 flex-shrink-0">+{h.delta}</span>
                </div>
              ))}
            </div>
          )}

          {/* Flagged */}
          {flags.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-rose-400/70 mb-1">Flagged</p>
              {flags.map((f: TeamSnapshotFlag, i: number) => (
                <div key={i} className="mb-0.5">
                  <span className="text-meta text-[var(--text-primary)]">{f.name}</span>
                  <span className="text-micro ml-1">{f.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legacy fallback: member list (for overviews created before v4) */}
      {!hasNewFormat && memberSnapshots.length > 0 && (
        <div className="px-[var(--space-card)] py-3 space-y-2">
          {memberSnapshots.map((snapshot: any, idx: number) => {
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
          })}
        </div>
      )}

      {/* Empty state */}
      {!hasNewFormat && memberSnapshots.length === 0 && (
        <div className="px-[var(--space-card)] py-3">
          <p className="text-meta">
            No member data available for this day.
          </p>
        </div>
      )}
    </div>
  )
}

// Feed View Component with optimistic respects
function FeedView({
  posts,
  loading,
  userId,
  supabase,
  onRefresh,
  setFeedPosts,
}: {
  posts: FeedPost[]
  loading: boolean
  userId: string | undefined
  supabase: any
  onRefresh: () => void
  setFeedPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  // Optimistic respect handler — updates UI immediately
  const handleRespect = useCallback(async (postId: string, hasRespected: boolean) => {
    if (!userId) return

    // Optimistic update
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return {
        ...p,
        has_respected: !hasRespected,
        respect_count: (p.respect_count || 0) + (hasRespected ? -1 : 1),
      }
    }))

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
    } catch (err) {
      console.error('Failed to toggle respect:', err)
      // Rollback on error
      setFeedPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        return {
          ...p,
          has_respected: hasRespected,
          respect_count: (p.respect_count || 0) + (hasRespected ? 1 : -1),
        }
      }))
    }
  }, [userId, supabase, setFeedPosts])

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
    return <FeedSkeleton count={3} />
  }

  if (posts.length === 0) {
    return (
      <div className="section-card text-center py-8">
        <Activity className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">No Posts Yet</h3>
        <p className="text-[12px] text-[var(--text-secondary)]">
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
