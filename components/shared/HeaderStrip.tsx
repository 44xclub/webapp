'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge } from '@/lib/types'
import { Shield, Zap, Award, Trophy, Crown } from 'lucide-react'

interface HeaderStripProps {
  profile: Profile | null
  loading?: boolean
}

const badgeIcons: Record<DisciplineBadge, typeof Shield> = {
  'Initiated': Shield,
  'Committed': Zap,
  'Elite': Award,
  'Forged': Trophy,
  '44-Pro': Crown,
}

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-steel-400',
  'Committed': 'text-accent-blue',
  'Elite': 'text-accent-cyan',
  'Forged': 'text-warning',
  '44-Pro': 'text-accent-purple',
}

const badgeBgColors: Record<DisciplineBadge, string> = {
  'Initiated': 'bg-steel-400',
  'Committed': 'bg-accent-blue',
  'Elite': 'bg-accent-cyan',
  'Forged': 'bg-warning',
  '44-Pro': 'bg-accent-purple',
}

export function HeaderStrip({ profile, loading }: HeaderStripProps) {
  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  if (loading || !profile || !disciplineLevel) {
    return (
      <div className="sticky top-0 z-50 header-gradient border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-surface rounded-card animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-20 bg-surface rounded animate-pulse" />
              <div className="h-3 w-16 bg-surface rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 bg-surface rounded-button animate-pulse" />
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()
  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const badgeColor = badgeColors[disciplineLevel.badge]
  const badgeBgColor = badgeBgColors[disciplineLevel.badge]

  return (
    <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-lg border-b border-border/50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-card bg-gradient-to-br from-steel-700 to-steel-900 border border-steel-600 flex items-center justify-center group-hover:border-primary/50 transition-all duration-200 shadow-card">
              <span className="text-body text-foreground font-semibold">{initials}</span>
            </div>
            <div>
              <p className="text-body font-semibold text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5">
                <BadgeIcon className={`h-3.5 w-3.5 ${badgeColor}`} />
                <span className="text-meta text-text-secondary">{disciplineLevel.badge}</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-center min-w-[48px]">
              <p className="text-micro uppercase tracking-wider text-text-muted mb-0.5">Level</p>
              <p className="text-page font-bold text-foreground">{disciplineLevel.level}</p>
            </div>
            <div className="w-px h-10 bg-border/50" />
            <div className="text-center min-w-[52px]">
              <p className="text-micro uppercase tracking-wider text-text-muted mb-0.5">Score</p>
              <p className="text-page font-bold text-primary">{profile.discipline_score}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar - only show if not max level */}
      {disciplineLevel.level < 44 && disciplineLevel.toNextLevel > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-micro text-text-muted mb-1.5">
            <span>Level {disciplineLevel.level}</span>
            <span className="text-text-secondary font-medium">
              {disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} pts
            </span>
            <span>Level {disciplineLevel.level + 1}</span>
          </div>
          <div className="h-2 bg-steel-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${badgeBgColor}`}
              style={{ width: `${Math.min(disciplineLevel.progress, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Max level indicator */}
      {disciplineLevel.level >= 44 && (
        <div className="px-4 pb-3">
          <div className="text-center text-meta text-accent-purple font-medium">
            Maximum Level Achieved
          </div>
        </div>
      )}
    </div>
  )
}
