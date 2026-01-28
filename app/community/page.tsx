'use client'

import { useState } from 'react'
import { Loader2, Heart, Trash2 } from 'lucide-react'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { useAuth } from '@/lib/contexts'
import { useTeam, useFeed } from '@/lib/hooks'
import { calculateDisciplineLevel } from '@/lib/types'
import type { TeamMemberOverview, FeedPost, Profile } from '@/lib/types'

type CommunityView = 'team' | 'feed'

export default function CommunityPage() {
  const { user } = useAuth()
  const [view, setView] = useState<CommunityView>('team')

  const { team, members, latestOverview, loading: teamLoading } = useTeam(user?.id)
  const { posts, loading: feedLoading, respectPost, removeRespect, deletePost } = useFeed(user?.id)

  return (
    <AuthenticatedLayout>
      {/* Page Header */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Community</h1>
        </div>

        {/* Toggle */}
        <div className="px-4 pb-3">
          <div className="inline-flex bg-secondary rounded-lg p-1 w-full">
            <button
              onClick={() => setView('team')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'team'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Team Overview
            </button>
            <button
              onClick={() => setView('feed')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'feed'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Feed
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 pb-8 overflow-y-auto">
        {view === 'team' ? (
          <TeamOverviewSection
            team={team}
            members={members}
            latestOverview={latestOverview}
            loading={teamLoading}
          />
        ) : (
          <FeedSection
            posts={posts}
            loading={feedLoading}
            userId={user?.id}
            onRespect={respectPost}
            onRemoveRespect={removeRespect}
            onDelete={deletePost}
          />
        )}
      </main>
    </AuthenticatedLayout>
  )
}

interface TeamOverviewSectionProps {
  team: { id: string; team_number: number } | null
  members: { id: string; user_id: string; profile?: Profile }[]
  latestOverview: { payload: { members: TeamMemberOverview[] }; date: string; generated_at: string } | null
  loading: boolean
}

function TeamOverviewSection({ team, members, latestOverview, loading }: TeamOverviewSectionProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">You are not assigned to a team yet.</p>
        <p className="text-sm text-muted-foreground mt-2">Teams are assigned by administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team Info */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Team {team.team_number}</h2>
        <p className="text-sm text-muted-foreground">{members.length} members</p>
      </div>

      {/* Members List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground">Members</h3>
        </div>
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground">
                {member.profile?.display_name || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                Score: {member.profile?.discipline_score ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Overview */}
      {latestOverview && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">Daily Overview</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(latestOverview.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Planned</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Done</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Missed</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestOverview.payload.members.map((memberOverview) => (
                  <tr key={memberOverview.user_id}>
                    <td className="px-4 py-2 text-foreground">{memberOverview.display_name}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{memberOverview.planned}</td>
                    <td className="px-3 py-2 text-center text-green-500">{memberOverview.completed}</td>
                    <td className="px-3 py-2 text-center text-red-500">{memberOverview.missed}</td>
                    <td className={`px-3 py-2 text-center font-medium ${
                      memberOverview.daily_delta >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {memberOverview.daily_delta >= 0 ? '+' : ''}{memberOverview.daily_delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

interface FeedSectionProps {
  posts: FeedPost[]
  loading: boolean
  userId: string | undefined
  onRespect: (postId: string) => Promise<void>
  onRemoveRespect: (postId: string) => Promise<void>
  onDelete: (postId: string) => Promise<void>
}

function FeedSection({ posts, loading, userId, onRespect, onRemoveRespect, onDelete }: FeedSectionProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">No posts yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete workouts and share them to the feed!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          isOwner={post.user_id === userId}
          onRespect={() => post.user_has_respected ? onRemoveRespect(post.id) : onRespect(post.id)}
          onDelete={() => onDelete(post.id)}
        />
      ))}
    </div>
  )
}

interface FeedPostCardProps {
  post: FeedPost
  isOwner: boolean
  onRespect: () => void
  onDelete: () => void
}

function FeedPostCard({ post, isOwner, onRespect, onDelete }: FeedPostCardProps) {
  const disciplineLevel = post.profile
    ? calculateDisciplineLevel(post.profile.discipline_score)
    : null

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* User Banner */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">
            {post.profile?.display_name || 'Unknown'}
          </p>
          {disciplineLevel && (
            <p className="text-xs text-muted-foreground">
              Level {disciplineLevel.level} - {disciplineLevel.badge}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-foreground mb-2">{post.title}</h3>

        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full rounded-lg mb-3"
          />
        )}

        {post.body && (
          <p className="text-sm text-muted-foreground">{post.body}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <button
          onClick={onRespect}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.user_has_respected
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${post.user_has_respected ? 'fill-current' : ''}`} />
          <span>{post.respects_count || 0} Respect</span>
        </button>

        {isOwner && (
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
