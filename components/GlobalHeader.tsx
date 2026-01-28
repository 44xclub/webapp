'use client'

import { useMemo } from 'react'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge } from '@/lib/types'
import { Trophy, Zap, Shield, Award, Crown } from 'lucide-react'

interface GlobalHeaderProps {
  profile: Profile
  userEmail?: string
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
  'Elite': 'text-purple-400',
  'Forged': 'text-amber-400',
  '44-Pro': 'text-yellow-400',
}

const progressColors: Record<DisciplineBadge, string> = {
  'Initiated': 'bg-slate-400',
  'Committed': 'bg-blue-400',
  'Elite': 'bg-purple-400',
  'Forged': 'bg-amber-400',
  '44-Pro': 'bg-yellow-400',
}

export function GlobalHeader({ profile, userEmail }: GlobalHeaderProps) {
  const disciplineLevel = useMemo(
    () => calculateDisciplineLevel(profile.discipline_score),
    [profile.discipline_score]
  )

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || userEmail?.split('@')[0] || 'User'

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border safe-top">
      <div className="px-4 py-2">
        {/* Main content row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: User name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <span className="text-sm font-medium text-foreground truncate">
              {displayName}
            </span>
          </div>

          {/* Right: Score, Level, Badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Discipline Score */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground leading-none">Score</p>
              <p className="text-sm font-bold text-foreground leading-tight">{profile.discipline_score}</p>
            </div>

            {/* Level */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground leading-none">Level</p>
              <p className="text-sm font-bold text-foreground leading-tight">{disciplineLevel.level}</p>
            </div>

            {/* Badge */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-secondary ${badgeColors[disciplineLevel.badge]}`}>
              <BadgeIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{disciplineLevel.badge}</span>
            </div>
          </div>
        </div>

        {/* Progress bar to next level */}
        {disciplineLevel.level < 44 && (
          <div className="mt-2">
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColors[disciplineLevel.badge]} transition-all duration-500`}
                style={{ width: `${disciplineLevel.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
