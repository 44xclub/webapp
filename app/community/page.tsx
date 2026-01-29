'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Activity, Heart, MessageCircle } from 'lucide-react'
import { useProfile } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { BottomNav } from '@/components/shared/BottomNav'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type TabType = 'team' | 'feed'

interface FeedPost {
  id: string
  user_id: string
  title: string
  body: string | null
  media_path: string | null
  created_at: string
  user_profile?: {
    display_name: string | null
    discipline_score: number
  }
  respect_count?: number
  has_respected?: boolean
}

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
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setFeedPosts(data || [])
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Strip */}
      <HeaderStrip profile={profile} loading={profileLoading} />

      {/* Page Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Community</h1>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 pb-3">
          <div className="inline-flex bg-secondary rounded-lg p-1 w-full">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'team'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Team
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'feed'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="h-4 w-4" />
              Feed
            </button>
          </div>
        </div>
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
  )
}

// Team Overview Component
function TeamOverview({ userId, supabase }: { userId: string | undefined; supabase: any }) {
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchTeamData()
    }
  }, [userId])

  const fetchTeamData = async () => {
    setLoading(true)
    try {
      // Fetch user's team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id, role, teams(id, team_number)')
        .eq('user_id', userId)
        .is('left_at', null)
        .single()

      if (membership?.team_id) {
        // Fetch team members
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id, role, joined_at, profiles(display_name, discipline_score)')
          .eq('team_id', membership.team_id)
          .is('left_at', null)
          .order('role', { ascending: false })

        setTeamData({
          team: membership.teams,
          members: members || [],
          role: membership.role,
        })
      }
    } catch (err) {
      console.error('Failed to fetch team:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!teamData?.team) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Team Yet</h3>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be assigned to a team of 8 members to keep each other accountable.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your Team</p>
            <p className="text-2xl font-bold text-foreground">Team #{teamData.team.team_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="text-xl font-bold text-foreground">{teamData.members.length}/8</p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground">Team Members</h3>
        </div>
        <div className="divide-y divide-border">
          {teamData.members.map((member: any) => (
            <div key={member.user_id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">
                    {(member.profiles?.display_name || 'M')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.profiles?.display_name || 'Member'}
                    {member.role === 'captain' && (
                      <span className="ml-2 text-xs text-primary">(Captain)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{member.profiles?.discipline_score || 0}</p>
                <p className="text-xs text-muted-foreground">pts</p>
              </div>
            </div>
          ))}
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
  const handleRespect = async (postId: string) => {
    if (!userId) return
    try {
      await supabase
        .from('feed_respects')
        .upsert({ post_id: postId, user_id: userId })
      onRefresh()
    } catch (err) {
      console.error('Failed to respect post:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Posts Yet</h3>
        <p className="text-sm text-muted-foreground">
          Share your workouts and achievements to inspire others.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Post Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium text-foreground">
                  {(post.user_profile?.display_name || 'M')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {post.user_profile?.display_name || 'Member'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-4 py-3">
            <h3 className="font-medium text-foreground mb-2">{post.title}</h3>
            {post.body && (
              <p className="text-sm text-muted-foreground">{post.body}</p>
            )}
          </div>

          {/* Post Actions */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-4">
            <button
              onClick={() => handleRespect(post.id)}
              className={`flex items-center gap-2 text-sm ${
                post.has_respected ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className={`h-4 w-4 ${post.has_respected ? 'fill-current' : ''}`} />
              <span>{post.respect_count || 0} Respect</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
