'use client'

import { Flame, Trophy } from 'lucide-react'

interface StreakModuleProps {
  currentStreak: number
  bestStreak: number
}

export function StreakModule({ currentStreak, bestStreak }: StreakModuleProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-around">
        {/* Current Streak */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Current Streak</span>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border" />

        {/* Best Streak */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold text-foreground">{bestStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Best Streak</span>
        </div>
      </div>
    </div>
  )
}
