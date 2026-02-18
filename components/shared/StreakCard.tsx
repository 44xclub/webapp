'use client'

import { Flame, Trophy } from 'lucide-react'

interface StreakCardProps {
  currentStreak: number
  bestStreak: number
  variant?: 'compact' | 'full' | 'strip'
}

export function StreakCard({ currentStreak, bestStreak, variant = 'compact' }: StreakCardProps) {
  if (variant === 'strip') {
    // Ultra-compact single-row strip for Home page (~44px)
    return (
      <div className="flex items-center justify-between px-3 h-[44px] bg-[rgba(255,255,255,0.025)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-[#f59e0b]" />
          <span className="text-[14px] font-semibold text-[#eef2ff]">{currentStreak}</span>
          <span className="text-[11px] text-[rgba(238,242,255,0.45)]">days</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className="h-3 w-3 text-[rgba(238,242,255,0.30)]" />
          <span className="text-[11px] text-[rgba(238,242,255,0.45)]">Best:</span>
          <span className="text-[13px] font-semibold text-[#22d3ee]">{bestStreak}</span>
        </div>
      </div>
    )
  }

  if (variant === 'full') {
    // Full variant for Profile page - single compact horizontal row, 64-72px max
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-[rgba(255,255,255,0.025)] rounded-[var(--radius-card)] border border-[rgba(255,255,255,0.06)] h-[68px]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[8px] bg-gradient-to-b from-[rgba(245,158,11,0.14)] to-[rgba(245,158,11,0.04)] flex items-center justify-center border border-[rgba(245,158,11,0.22)]">
            <Flame className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-bold text-[#eef2ff]">{currentStreak}</span>
              <span className="text-[11px] text-[rgba(238,242,255,0.50)]">days</span>
            </div>
            <p className="text-[10px] text-[rgba(238,242,255,0.40)] font-medium uppercase tracking-wider">Current</p>
          </div>
        </div>
        <div className="w-px h-8 bg-[rgba(255,255,255,0.07)]" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[8px] bg-gradient-to-b from-[rgba(34,197,94,0.14)] to-[rgba(34,197,94,0.04)] flex items-center justify-center border border-[rgba(34,197,94,0.22)]">
            <Trophy className="h-4 w-4 text-[#22c55e]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-bold text-[#eef2ff]">{bestStreak}</span>
              <span className="text-[11px] text-[rgba(238,242,255,0.50)]">days</span>
            </div>
            <p className="text-[10px] text-[rgba(238,242,255,0.40)] font-medium uppercase tracking-wider">Best</p>
          </div>
        </div>
      </div>
    )
  }

  // Compact variant for Home page
  return (
    <div className="px-3 py-2 bg-[rgba(255,255,255,0.025)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[8px] bg-gradient-to-b from-[rgba(245,158,11,0.14)] to-[rgba(245,158,11,0.04)] flex items-center justify-center border border-[rgba(245,158,11,0.22)]">
            <Flame className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.45)]">Streak</p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[18px] font-semibold text-[#eef2ff]">{currentStreak}</span>
              <span className="text-[11px] text-[rgba(238,242,255,0.50)]">days</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.45)]">Best</p>
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-[14px] font-semibold text-[#22d3ee]">{bestStreak}</span>
            <span className="text-[11px] text-[rgba(238,242,255,0.50)]">days</span>
          </div>
        </div>
      </div>
    </div>
  )
}
