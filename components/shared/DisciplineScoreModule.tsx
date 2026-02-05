'use client'

import { useState } from 'react'
import { Shield, Zap, Award, Trophy, Crown } from 'lucide-react'
import { DisciplineSystemModal } from './DisciplineSystemModal'
import type { DisciplineBadge, ProfileRank } from '@/lib/types'
import { calculateDisciplineLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

// Badge icons and colors
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
  const levelData = rank
    ? {
        level: rank.level,
        badge: rank.badge_tier,
        progress: rank.level_progress_pct,
        score: rank.discipline_score,
      }
    : score !== undefined
    ? (() => {
        const calc = calculateDisciplineLevel(score)
        return {
          level: calc.level,
          badge: calc.badge,
          progress: calc.progress,
          score,
        }
      })()
    : null

  if (!levelData) return null

  const { level, badge, progress, score: displayScore } = levelData
  const BadgeIcon = badgeIcons[badge]
  const badgeColor = badgeColors[badge]
  const badgeBgColor = badgeBgColors[badge]

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
            className
          )}
          disabled={!clickable}
        >
          <BadgeIcon className={cn('h-3.5 w-3.5', badgeColor)} />
          <span className="text-[11px] font-medium text-[rgba(238,242,255,0.60)]">
            Lv.{level}
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
          <div className="flex items-center gap-1.5">
            <BadgeIcon className={cn('h-4 w-4', badgeColor)} />
            <span className={cn('text-[12px] font-medium', badgeColor)}>{badge}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[rgba(238,242,255,0.60)]">Lv.{level}</span>
            <span className="text-[#3b82f6] font-semibold">{displayScore}</span>
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
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[48px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)] mb-0.5">Level</p>
            <p className="text-[22px] font-semibold text-[#eef2ff]">{level}</p>
          </div>
          <div className="w-px h-10 bg-[rgba(255,255,255,0.07)]" />
          <div className="text-center min-w-[52px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.52)] mb-0.5">Score</p>
            <p className="text-[22px] font-semibold text-[#3b82f6]">{displayScore}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && level < 44 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-medium text-[rgba(238,242,255,0.52)] mb-1.5">
              <span>Level {level}</span>
              <span className="text-[rgba(238,242,255,0.60)]">
                {Math.round(progress)}%
              </span>
              <span>Level {level + 1}</span>
            </div>
            <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', badgeBgColor)}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Max level indicator */}
        {showProgress && level >= 44 && (
          <div className="mt-3 text-center text-[12px] font-medium text-[#a78bfa]">
            Maximum Level Achieved
          </div>
        )}
      </div>

      {clickable && <DisciplineSystemModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  )
}

// Export badge styling utilities for use in other components
export { badgeIcons, badgeColors, badgeBgColors }
