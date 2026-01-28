'use client'

import { useState } from 'react'
import { Loader2, LogOut, Settings, Trophy, Flame, Calendar, Dumbbell, UtensilsCrossed, Shield, Zap, Award, Crown } from 'lucide-react'
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/contexts'
import { useProfile, useBlocks, useDailyScores } from '@/lib/hooks'
import { calculateDisciplineLevel } from '@/lib/types'
import type { DisciplineBadge, DailyScore } from '@/lib/types'

const badgeIcons: Record<DisciplineBadge, typeof Trophy> = {
  'Initiated': Shield,
  'Committed': Zap,
  'Elite': Award,
  'Forged': Trophy,
  '44-Pro': Crown,
}

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400 bg-slate-400/10',
  'Committed': 'text-blue-400 bg-blue-400/10',
  'Elite': 'text-purple-400 bg-purple-400/10',
  'Forged': 'text-amber-400 bg-amber-400/10',
  '44-Pro': 'text-yellow-400 bg-yellow-400/10',
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const { scores, loading: scoresLoading } = useDailyScores(user?.id, 30)

  if (profileLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    )
  }

  const disciplineLevel = profile
    ? calculateDisciplineLevel(profile.discipline_score)
    : null

  const BadgeIcon = disciplineLevel ? badgeIcons[disciplineLevel.badge] : Shield

  // Calculate stats
  const daysAsMember = profile?.committed_at
    ? Math.floor((Date.now() - new Date(profile.committed_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Count workouts and meals from scores breakdown
  const workoutsCompleted = scores.reduce((total, score) => {
    const breakdown = score.breakdown as { completed_blocks?: number }
    return total + (breakdown?.completed_blocks || 0)
  }, 0)

  return (
    <AuthenticatedLayout>
      {/* Page Header */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 pb-8 space-y-4 overflow-y-auto">
        {/* User Info Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">
                {(profile?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {profile?.display_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Discipline Stats Card */}
        {disciplineLevel && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Discipline Score</p>
                <p className="text-3xl font-bold text-foreground">{profile?.discipline_score}</p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${badgeColors[disciplineLevel.badge]}`}>
                <BadgeIcon className="h-5 w-5" />
                <span className="font-medium">{disciplineLevel.badge}</span>
              </div>
            </div>

            {/* Level and Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level {disciplineLevel.level}</span>
                {disciplineLevel.level < 44 && (
                  <span className="text-muted-foreground">
                    {disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} to next level
                  </span>
                )}
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${disciplineLevel.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Streak Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-medium text-foreground mb-4">Streaks</h3>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold text-foreground">
                  {profile?.current_streak ?? 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Current</span>
            </div>

            <div className="h-10 w-px bg-border" />

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-foreground">
                  {profile?.best_streak ?? 0}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Best</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Days as Member</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{daysAsMember}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Blocks Completed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{workoutsCompleted}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-foreground">Recent Activity</h3>
          </div>
          {scoresLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : scores.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No activity yet. Start completing blocks!
            </div>
          ) : (
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {scores.slice(0, 10).map((score) => (
                <DailyScoreRow key={score.id} score={score} />
              ))}
            </div>
          )}
        </div>

        {/* Settings placeholder */}
        <div className="bg-card rounded-xl border border-border p-4">
          <button className="w-full flex items-center gap-3 text-left">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Settings</p>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </button>
        </div>
      </main>
    </AuthenticatedLayout>
  )
}

function DailyScoreRow({ score }: { score: DailyScore }) {
  const date = new Date(score.date)
  const breakdown = score.breakdown as {
    completed_blocks?: number
    missed_penalty?: number
    framework_points?: number
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm text-foreground">
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-muted-foreground">
          {breakdown?.completed_blocks || 0} blocks completed
        </p>
      </div>
      <span className={`text-sm font-medium ${score.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {score.delta >= 0 ? '+' : ''}{score.delta}
      </span>
    </div>
  )
}
