'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge, ProfileRank } from '@/lib/types'
import { badgeIcons, badgeColors, badgeBgColors, romanNumerals } from './DisciplineScoreModule'
import { DisciplineSystemModal } from './DisciplineSystemModal'
import { NotificationBell } from './NotificationBell'

interface HeaderStripProps {
  profile: Profile | null
  rank?: ProfileRank | null
  loading?: boolean
  avatarUrl?: string | null
}

export function HeaderStrip({ profile, rank, loading, avatarUrl: avatarUrlProp }: HeaderStripProps) {
  const [scoreModalOpen, setScoreModalOpen] = useState(false)

  // Use rank data if available (from v_profiles_rank view), otherwise calculate from profile
  const disciplineData = useMemo(() => {
    if (rank) {
      return {
        badge: rank.badge,
        badgeLevel: rank.badge_level,
        progress: rank.badge_progress_pct,
        score: rank.discipline_score,
        canWearBadge: rank.can_wear_badge,
      }
    }
    if (profile) {
      const calc = calculateDisciplineLevel(profile.discipline_score)
      return {
        badge: calc.badge,
        badgeLevel: calc.badgeLevel,
        progress: calc.progressInBadge,
        score: profile.discipline_score,
        canWearBadge: true, // Assume eligible when no rank data
      }
    }
    return null
  }, [profile, rank])

  if (loading || !profile || !disciplineData) {
    return (
      <div className="sticky top-0 z-50 bg-[#07090d] border-b border-[rgba(255,255,255,0.07)] safe-top">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-[rgba(255,255,255,0.045)] rounded-full animate-pulse" />
            <div className="space-y-1">
              <div className="h-3.5 w-20 bg-[rgba(255,255,255,0.045)] rounded-[6px] animate-pulse" />
              <div className="h-2.5 w-16 bg-[rgba(255,255,255,0.045)] rounded-[6px] animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-16 bg-[rgba(255,255,255,0.045)] rounded-[8px] animate-pulse" />
        </div>
        <div className="px-4 pb-3">
          <div className="h-[6px] bg-[rgba(255,255,255,0.03)] rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()
  const avatarUrl = avatarUrlProp
  const BadgeIcon = badgeIcons[disciplineData.badge]
  const badgeColor = badgeColors[disciplineData.badge]
  const badgeBgColor = badgeBgColors[disciplineData.badge]
  const badgeDisplay = `${disciplineData.badge} ${romanNumerals[disciplineData.badgeLevel - 1] || 'I'}`

  return (
    <div className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.07)] safe-top">
      {/* Row 1: Avatar + Name/Level (left) | Bell + Points (right) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <Link href="/profile" className="flex items-center gap-2.5 group flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center flex-shrink-0 group-hover:border-[rgba(59,130,246,0.34)] transition-all duration-[140ms] overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[14px] text-[#eef2ff] font-bold">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#eef2ff] truncate group-hover:text-[#60a5fa] transition-colors duration-[140ms]">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5">
              {!disciplineData.canWearBadge && (
                <Lock className="h-3 w-3 text-[rgba(238,242,255,0.40)]" />
              )}
              <BadgeIcon className={`h-3 w-3 ${disciplineData.canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]'}`} />
              <span className={`text-[11px] font-medium ${disciplineData.canWearBadge ? 'text-[rgba(238,242,255,0.55)]' : 'text-[rgba(238,242,255,0.40)]'}`}>
                {badgeDisplay}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <NotificationBell userId={profile.id} />
          <button
            onClick={() => setScoreModalOpen(true)}
            className="text-[13px] font-bold text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
          >
            {disciplineData.score} pts
          </button>
        </div>
      </div>

      {/* Row 2: Progress bar - tight spacing */}
      {disciplineData.badge !== '44 Pro' && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-[10px] font-medium text-[rgba(238,242,255,0.45)] mb-1">
            <span>{badgeDisplay}</span>
            <span className="text-[rgba(238,242,255,0.55)]">
              {Math.round(disciplineData.progress)}%
            </span>
            <span>
              {disciplineData.badgeLevel < 5
                ? `${disciplineData.badge} ${romanNumerals[disciplineData.badgeLevel] || 'II'}`
                : 'Next Badge'
              }
            </span>
          </div>
          <div className="h-[6px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${disciplineData.canWearBadge ? badgeBgColor : 'bg-[rgba(238,242,255,0.20)]'}`}
              style={{ width: `${Math.min(disciplineData.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Max badge indicator */}
      {disciplineData.badge === '44 Pro' && disciplineData.badgeLevel >= 5 && (
        <div className="px-4 pb-2">
          <div className="text-center text-[11px] font-medium text-purple-400">
            Maximum Badge Achieved
          </div>
        </div>
      )}

      <DisciplineSystemModal isOpen={scoreModalOpen} onClose={() => setScoreModalOpen(false)} />
    </div>
  )
}
