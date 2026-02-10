'use client'

import { Flame, Trophy } from 'lucide-react'

interface StreakCardProps {
  currentStreak: number
  bestStreak: number
  variant?: 'compact' | 'full'
}

export function StreakCard({ currentStreak, bestStreak, variant = 'compact' }: StreakCardProps) {
  if (variant === 'full') {
    // Full variant for Profile page - matches the two-column grid style
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3.5 bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
          <div className="h-8 w-8 rounded-[8px] bg-gradient-to-b from-[rgba(245,158,11,0.14)] to-[rgba(245,158,11,0.04)] flex items-center justify-center border border-[rgba(245,158,11,0.22)] mx-auto mb-1.5">
            <Flame className="h-4 w-4 text-[#f59e0b]" />
          </div>
          <p className="text-[18px] font-bold text-[#eef2ff]">{currentStreak}</p>
          <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Current Streak</p>
        </div>
        <div className="text-center p-3.5 bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)]">
          <div className="h-8 w-8 rounded-[8px] bg-gradient-to-b from-[rgba(34,197,94,0.14)] to-[rgba(34,197,94,0.04)] flex items-center justify-center border border-[rgba(34,197,94,0.22)] mx-auto mb-1.5">
            <Trophy className="h-4 w-4 text-[#22c55e]" />
          </div>
          <p className="text-[18px] font-bold text-[#eef2ff]">{bestStreak}</p>
          <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Best Streak</p>
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
