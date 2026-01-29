'use client'

import { useMemo } from 'react'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge } from '@/lib/types'
import { Trophy, Zap, Shield, Award, Crown } from 'lucide-react'

interface HeaderStripProps {
  profile: Profile | null
  loading?: boolean
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

export function HeaderStrip({ profile, loading }: HeaderStripProps) {
  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  if (loading || !profile || !disciplineLevel) {
    return (
      <div className="bg-card border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || 'Member'

  return (
    <div className="bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Name and Badge */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm">{displayName}</span>
          <span className={`flex items-center gap-1 text-xs ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-3.5 w-3.5" />
            <span>Lv.{disciplineLevel.level}</span>
          </span>
        </div>

        {/* Right: Score and Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{profile.discipline_score}</span>
            <span className="text-xs text-muted-foreground ml-1">pts</span>
          </div>

          {/* Mini progress bar */}
          {disciplineLevel.level < 44 && (
            <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${disciplineLevel.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
