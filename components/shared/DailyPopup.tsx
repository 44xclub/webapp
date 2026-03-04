'use client'

import { useState, useEffect } from 'react'
import { Flame, Trophy, X } from 'lucide-react'
import { formatDateForApi } from '@/lib/date'

interface DailyPopupProps {
  currentStreak: number
  bestStreak: number
  displayName?: string | null
}

const STORAGE_KEY = '44club_daily_popup_date'

export function DailyPopup({ currentStreak, bestStreak, displayName }: DailyPopupProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const today = formatDateForApi(new Date())
    const lastShown = localStorage.getItem(STORAGE_KEY)
    if (lastShown !== today) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    const today = formatDateForApi(new Date())
    localStorage.setItem(STORAGE_KEY, today)
    setVisible(false)
  }

  if (!visible) return null

  const greeting = getGreeting()
  const firstName = displayName?.split(' ')[0] || ''
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#05070a]/85 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative z-10 w-[min(340px,calc(100vw-40px))] rounded-[20px] bg-[#0d1014] border border-[rgba(255,255,255,0.10)] shadow-2xl overflow-hidden animate-slideUp">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-[10px] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.85)] hover:bg-[rgba(255,255,255,0.06)] transition-all z-10"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="px-6 pt-6 pb-5 text-center">
          {/* Greeting */}
          <p className="text-[13px] text-[rgba(238,242,255,0.50)] font-medium mb-1">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </p>

          {/* Streak display */}
          <div className="flex items-center justify-center gap-2.5 mt-4 mb-3">
            <div className="h-12 w-12 rounded-[14px] bg-gradient-to-b from-[rgba(245,158,11,0.18)] to-[rgba(245,158,11,0.04)] flex items-center justify-center border border-[rgba(245,158,11,0.25)]">
              <Flame className="h-6 w-6 text-[#f59e0b]" />
            </div>
            <div className="text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold text-[#eef2ff] leading-none">{currentStreak}</span>
                <span className="text-[14px] text-[rgba(238,242,255,0.50)]">day streak</span>
              </div>
              {isNewBest && currentStreak > 1 && (
                <p className="text-[11px] text-[#f59e0b] font-semibold mt-0.5">Personal best!</p>
              )}
            </div>
          </div>

          {/* Best streak */}
          {!isNewBest && bestStreak > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-[rgba(238,242,255,0.40)] mt-1">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[12px]">Best: {bestStreak} days</span>
            </div>
          )}

          {/* Motivational line */}
          <p className="text-[13px] text-[rgba(238,242,255,0.55)] mt-4 leading-relaxed">
            {getMotivation(currentStreak)}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="w-full py-3.5 text-[14px] font-semibold text-[#3b82f6] border-t border-[rgba(255,255,255,0.07)] hover:bg-[rgba(59,130,246,0.06)] transition-colors"
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getMotivation(streak: number): string {
  if (streak === 0) return 'Start your streak today. One block at a time.'
  if (streak === 1) return 'Day one done. Keep building.'
  if (streak < 7) return 'Consistency compounds. Keep showing up.'
  if (streak < 14) return 'A full week. Discipline is becoming habit.'
  if (streak < 30) return 'Two weeks strong. You\'re in the zone.'
  if (streak < 60) return 'A month of discipline. Rare territory.'
  return 'Elite consistency. Stay the course.'
}
