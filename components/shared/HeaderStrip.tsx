'use client'

import { useMemo } from 'react'
import Link from 'next/link'
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
  'Elite': 'text-cyan-400',
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
      <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-secondary rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Name */}
        <Link href="/profile" className="flex items-center gap-3 group">
          {/* Avatar - initials only for now */}
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
            <span className="text-sm font-semibold text-muted-foreground">
              {initials}
            </span>
          </div>
          {/* Name */}
          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
            {displayName}
          </span>
        </Link>

        {/* Right: Badge + Score + Progress */}
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <span className={`flex items-center gap-1 text-xs font-medium ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-4 w-4" />
            <span>Lv.{disciplineLevel.level}</span>
          </span>

          {/* Score */}
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
