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

  return (
    <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-lg border-b border-border/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-card bg-gradient-to-br from-steel-700 to-steel-900 border border-steel-600 flex items-center justify-center group-hover:border-primary/50 transition-all duration-200 shadow-card">
            <span className="text-body text-foreground font-semibold">{initials}</span>
          </div>
          <div>
            <p className="text-body font-semibold text-foreground group-hover:text-primary transition-colors">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5">
              <BadgeIcon className={`h-3 w-3 ${badgeColor}`} />
              <span className="text-micro text-text-secondary">{disciplineLevel.badge}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-micro uppercase tracking-wider text-text-muted">Level</p>
            <p className="text-section font-bold text-foreground">{disciplineLevel.level}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-right">
            <p className="text-micro uppercase tracking-wider text-text-muted">Score</p>
            <p className="text-section font-bold text-primary">{profile.discipline_score}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
