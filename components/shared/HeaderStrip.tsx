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
  'Initiated': 'text-[rgba(238,242,255,0.60)]',
  'Committed': 'text-[#60a5fa]',
  'Elite': 'text-[#22d3ee]',
  'Forged': 'text-[#f59e0b]',
  '44-Pro': 'text-[#a78bfa]',
}

const badgeBgColors: Record<DisciplineBadge, string> = {
  'Initiated': 'bg-[rgba(238,242,255,0.60)]',
  'Committed': 'bg-[#60a5fa]',
  'Elite': 'bg-[#22d3ee]',
  'Forged': 'bg-[#f59e0b]',
  '44-Pro': 'bg-[#a78bfa]',
}

export function HeaderStrip({ profile, loading }: HeaderStripProps) {
  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  if (loading || !profile || !disciplineLevel) {
    return (
      <div className="sticky top-0 z-50 bg-[#07090d] border-b border-[rgba(255,255,255,0.07)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[rgba(255,255,255,0.045)] rounded-[16px] animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-20 bg-[rgba(255,255,255,0.045)] rounded-[8px] animate-pulse" />
              <div className="h-3 w-16 bg-[rgba(255,255,255,0.045)] rounded-[8px] animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 bg-[rgba(255,255,255,0.045)] rounded-[12px] animate-pulse" />
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
    <div className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.07)]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-[16px] bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center group-hover:border-[rgba(59,130,246,0.34)] transition-all duration-[140ms] shadow-sm">
              <span className="text-[15px] text-[#eef2ff] font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#eef2ff] group-hover:text-[#60a5fa] transition-colors duration-[140ms]">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5">
                <BadgeIcon className={`h-3.5 w-3.5 ${badgeColor}`} />
                <span className="text-[12px] font-medium text-[rgba(238,242,255,0.60)]">{disciplineLevel.badge}</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-center min-w-[48px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)] mb-0.5">Level</p>
              <p className="text-[22px] font-semibold text-[#eef2ff]">{disciplineLevel.level}</p>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.07)]" />
            <div className="text-center min-w-[52px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)] mb-0.5">Score</p>
              <p className="text-[22px] font-semibold text-[#3b82f6]">{profile.discipline_score}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar - only show if not max level */}
      {disciplineLevel.level < 44 && disciplineLevel.toNextLevel > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-[rgba(238,242,255,0.52)] mb-1.5">
            <span>Level {disciplineLevel.level}</span>
            <span className="text-[rgba(238,242,255,0.60)]">
              {disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel} pts
            </span>
            <span>Level {disciplineLevel.level + 1}</span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
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
          <div className="text-center text-[12px] font-medium text-[#a78bfa]">
            Maximum Level Achieved
          </div>
        </div>
      )}
    </div>
  )
}
