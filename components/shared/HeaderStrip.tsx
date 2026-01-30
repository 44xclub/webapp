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
      <div className="sticky top-0 z-40 header-blur px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/[0.04] rounded-full skeleton" />
            <div className="h-4 w-24 bg-white/[0.04] rounded skeleton" />
          </div>
          <div className="h-4 w-20 bg-white/[0.04] rounded skeleton" />
        </div>
      </div>
    )
  }

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="sticky top-0 z-40 header-blur px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Name */}
        <Link href="/profile" className="flex items-center gap-3 group">
          {/* Avatar - initials only for now */}
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center ring-2 ring-white/[0.06] group-hover:ring-primary/30 transition-all shadow-inner">
            <span className="text-sm font-bold text-foreground/80">
              {initials}
            </span>
          </div>
          {/* Name */}
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {displayName}
          </span>
        </Link>

        {/* Right: Badge + Score + Progress */}
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">Lv.{disciplineLevel.level}</span>
          </div>

          {/* Score */}
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{profile.discipline_score}</span>
            <span className="text-xs text-muted-foreground ml-1">pts</span>
          </div>

          {/* Mini progress bar */}
          {disciplineLevel.level < 44 && (
            <div className="w-12 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500 rounded-full"
                style={{ width: `${disciplineLevel.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
