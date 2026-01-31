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
  'Initiated': 'text-zinc-400',
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
      <div className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-zinc-800 rounded-md animate-pulse" />
            <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Name */}
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-blue-500 transition-colors">
            <span className="text-sm font-bold text-zinc-300">{initials}</span>
          </div>
          <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
            {displayName}
          </span>
        </Link>

        {/* Right: Badge + Score + Progress */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">Lv.{disciplineLevel.level}</span>
          </div>

          <div className="text-right">
            <span className="text-sm font-bold text-zinc-200">{profile.discipline_score}</span>
            <span className="text-xs text-zinc-500 ml-1">pts</span>
          </div>

          {disciplineLevel.level < 44 && (
            <div className="w-10 h-1.5 bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${disciplineLevel.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
