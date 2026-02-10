'use client'

import { useState } from 'react'
import { Shield, Target, Flame, Swords, Award, Anvil, Rocket, Crown, Lock } from 'lucide-react'
import { DisciplineSystemModal } from './DisciplineSystemModal'
import type { DisciplineBadge, ProfileRank, DisciplineLevel } from '@/lib/types'
import { calculateDisciplineLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

// Badge icons for each tier
const badgeIcons: Record<DisciplineBadge, typeof Shield> = {
  'Initiated': Shield,
  'Aligned': Target,
  'Committed': Flame,
  'Disciplined': Swords,
  'Elite': Award,
  'Forged': Anvil,
  'Vanguard': Rocket,
  '44 Pro': Crown,
}

// Badge text colors
const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Aligned': 'text-emerald-400',
  'Committed': 'text-blue-400',
  'Disciplined': 'text-indigo-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  'Vanguard': 'text-rose-400',
  '44 Pro': 'text-purple-400',
}

// Badge background colors for progress bars
const badgeBgColors: Record<DisciplineBadge, string> = {
  'Initiated': 'bg-slate-400',
  'Aligned': 'bg-emerald-400',
  'Committed': 'bg-blue-400',
  'Disciplined': 'bg-indigo-400',
  'Elite': 'bg-cyan-400',
  'Forged': 'bg-amber-400',
  'Vanguard': 'bg-rose-400',
  '44 Pro': 'bg-purple-400',
}

// Badge glow colors for active state
const badgeGlowColors: Record<DisciplineBadge, string> = {
  'Initiated': 'shadow-slate-400/30',
  'Aligned': 'shadow-emerald-400/30',
  'Committed': 'shadow-blue-400/30',
  'Disciplined': 'shadow-indigo-400/30',
  'Elite': 'shadow-cyan-400/30',
  'Forged': 'shadow-amber-400/30',
  'Vanguard': 'shadow-rose-400/30',
  '44 Pro': 'shadow-purple-400/30',
}

// Roman numerals for badge levels
const romanNumerals = ['I', 'II', 'III', 'IV', 'V']

interface DisciplineScoreModuleProps {
  // Either use ProfileRank from v_profiles_rank view (preferred)
  rank?: ProfileRank | null
  // Or fallback to raw score (will calculate locally)
  score?: number
  // Variant for different display contexts
  variant?: 'full' | 'compact' | 'minimal'
  // Whether clicking opens the modal
  clickable?: boolean
  // Show progress bar
  showProgress?: boolean
  // Custom class name
  className?: string
}

export function DisciplineScoreModule({
  rank,
  score,
  variant = 'full',
  clickable = true,
  showProgress = true,
  className,
}: DisciplineScoreModuleProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Get level data from rank (preferred) or calculate from score
  const levelData: {
    badge: DisciplineBadge
    badgeLevel: number
    progress: number
    score: number
    canWearBadge: boolean
    eligibilityReason?: string
  } | null = rank
    ? {
        badge: rank.badge,
        badgeLevel: rank.badge_level,
        progress: rank.badge_progress_pct,
        score: rank.discipline_score,
        canWearBadge: rank.can_wear_badge,
        eligibilityReason: !rank.can_wear_badge
          ? `${rank.executed_days_7d ?? 0}/4 days executed, ${Math.round(rank.avg_execution_7d ?? 0)}% avg`
          : undefined,
      }
    : score !== undefined
    ? (() => {
        const calc = calculateDisciplineLevel(score)
        return {
          badge: calc.badge,
          badgeLevel: calc.badgeLevel,
          progress: calc.progressInBadge,
          score,
          canWearBadge: true, // Assume eligible when no rank data
        }
      })()
    : null

  if (!levelData) return null

  const { badge, badgeLevel, progress, score: displayScore, canWearBadge, eligibilityReason } = levelData
  const BadgeIcon = badgeIcons[badge]
  const badgeColor = badgeColors[badge]
  const badgeBgColor = badgeBgColors[badge]
  const badgeGlow = badgeGlowColors[badge]

  // Badge display name with roman numeral level
  const badgeDisplay = `${badge} ${romanNumerals[badgeLevel - 1] || 'I'}`

  const handleClick = () => {
    if (clickable) setModalOpen(true)
  }

  // Minimal variant - just badge icon and level (for feed posts)
  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'flex items-center gap-1.5',
            clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
            !canWearBadge && 'opacity-50',
            className
          )}
          disabled={!clickable}
        >
          {!canWearBadge && <Lock className="h-2.5 w-2.5 text-[rgba(238,242,255,0.40)]" />}
          <BadgeIcon className={cn('h-3.5 w-3.5', canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]')} />
          <span className={cn(
            'text-[11px] font-medium',
            canWearBadge ? 'text-[rgba(238,242,255,0.60)]' : 'text-[rgba(238,242,255,0.40)]'
          )}>
            {badgeDisplay}
          </span>
        </button>
        {clickable && <DisciplineSystemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  // Compact variant - badge, level, score in one row (for team list)
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'flex items-center gap-3',
            clickable && 'cursor-pointer hover:opacity-90 transition-opacity',
            className
          )}
          disabled={!clickable}
        >
          <div className={cn('flex items-center gap-1.5', !canWearBadge && 'opacity-50')}>
            {!canWearBadge && <Lock className="h-3 w-3 text-[rgba(238,242,255,0.40)]" />}
            <BadgeIcon className={cn('h-4 w-4', canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]')} />
            <span className={cn('text-[12px] font-medium', canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]')}>
              {badgeDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#3b82f6] font-semibold">{displayScore} pts</span>
          </div>
        </button>
        {clickable && <DisciplineSystemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  // Full variant - complete display with progress bar (for header/profile)
  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'select-none',
          clickable && 'cursor-pointer',
          className
        )}
      >
        {/* Badge and Score Display */}
        <div className="flex items-center gap-4">
          {/* Badge Section */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-[10px] border transition-all',
            canWearBadge
              ? `bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] shadow-lg ${badgeGlow}`
              : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)]'
          )}>
            {!canWearBadge && <Lock className="h-3.5 w-3.5 text-[rgba(238,242,255,0.40)]" />}
            <BadgeIcon className={cn('h-5 w-5', canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]')} />
            <div>
              <p className={cn(
                'text-[14px] font-semibold leading-tight',
                canWearBadge ? badgeColor : 'text-[rgba(238,242,255,0.40)]'
              )}>
                {badgeDisplay}
              </p>
              {!canWearBadge && (
                <p className="text-[10px] text-rose-400 leading-tight">Locked</p>
              )}
            </div>
          </div>

          <div className="w-px h-10 bg-[rgba(255,255,255,0.07)]" />

          {/* Score Section */}
          <div className="text-center min-w-[60px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)] mb-0.5">
              Lifetime Score
            </p>
            <p className="text-[22px] font-semibold text-[#eef2ff]">{displayScore}</p>
          </div>
        </div>

        {/* Locked Badge Reason */}
        {!canWearBadge && eligibilityReason && (
          <div className="mt-2 px-3 py-1.5 rounded-[8px] bg-rose-500/10 border border-rose-500/20">
            <p className="text-[11px] text-rose-400">
              <Lock className="inline h-3 w-3 mr-1" />
              Standards not maintained: {eligibilityReason}
            </p>
          </div>
        )}

        {/* Progress Bar - shows progress within current badge */}
        {showProgress && canWearBadge && badge !== '44 Pro' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-medium text-[rgba(238,242,255,0.52)] mb-1.5">
              <span>{badge} {romanNumerals[badgeLevel - 1] || 'I'}</span>
              <span className="text-[rgba(238,242,255,0.60)]">
                {Math.round(progress)}%
              </span>
              <span>
                {badgeLevel < 5 ? `${badge} ${romanNumerals[badgeLevel] || 'II'}` : 'Next Badge'}
              </span>
            </div>
            <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', badgeBgColor)}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Max badge indicator */}
        {showProgress && badge === '44 Pro' && badgeLevel >= 5 && (
          <div className="mt-3 text-center text-[12px] font-medium text-purple-400">
            Maximum Badge Achieved
          </div>
        )}
      </div>

      {clickable && <DisciplineSystemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  )
}

// Export badge styling utilities for use in other components
export { badgeIcons, badgeColors, badgeBgColors, badgeGlowColors, romanNumerals }
