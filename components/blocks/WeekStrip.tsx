'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  getWeekDays,
  getShortDayName,
  getDayNumber,
  isSameDayDate,
  formatDateForApi,
  getNextWeek,
  getPreviousWeek,
} from '@/lib/date'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { isToday } from 'date-fns'
import type { Block } from '@/lib/types'

interface WeekStripProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onWeekChange: (date: Date) => void
  blocksByDate?: Map<string, Block[]>
}

export function WeekStrip({
  selectedDate,
  onSelectDate,
  onWeekChange,
  blocksByDate,
}: WeekStripProps) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const today = useMemo(() => new Date(), [])

  const goToPreviousWeek = () => {
    onWeekChange(getPreviousWeek(selectedDate))
  }

  const goToNextWeek = () => {
    onWeekChange(getNextWeek(selectedDate))
  }

  const goToToday = () => {
    onSelectDate(today)
    onWeekChange(today)
  }

  // Get block count for a day
  const getBlockCount = (dateKey: string): number => {
    if (!blocksByDate) return 0
    const blocks = blocksByDate.get(dateKey) || []
    return blocks.filter((b) => !b.deleted_at).length
  }

  return (
    <div className="bg-[#07090d] border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-30 safe-top">
      {/* Navigation row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5 text-[rgba(238,242,255,0.52)]" />
        </button>

        <button
          onClick={goToToday}
          className="px-4 py-1.5 text-[13px] font-semibold bg-[rgba(59,130,246,0.12)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.18)] rounded-lg transition-colors"
        >
          Today
        </button>

        <button
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5 text-[rgba(238,242,255,0.52)]" />
        </button>
      </div>

      {/* Week days */}
      <div className="flex justify-around px-2 pb-3">
        {weekDays.map((day) => {
          const isSelected = isSameDayDate(day, selectedDate)
          const isTodayDate = isToday(day)
          const dateKey = formatDateForApi(day)
          const dayBlocks = blocksByDate?.get(dateKey) || []
          const hasBlocks = dayBlocks.length > 0
          const allCompleted = hasBlocks && dayBlocks.every(b => b.completed_at)

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-[44px] transition-all',
                isSelected
                  ? 'bg-[#3b82f6] text-white'
                  : 'hover:bg-[rgba(255,255,255,0.04)]'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isSelected ? 'text-white' : 'text-[rgba(238,242,255,0.52)]'
                )}
              >
                {getShortDayName(day)}
              </span>
              <span
                className={cn(
                  'text-[18px] font-medium',
                  isSelected ? 'text-white' : 'text-[#eef2ff]',
                  isTodayDate && !isSelected && 'text-[#3b82f6]'
                )}
              >
                {getDayNumber(day)}
              </span>
              {/* Block indicator - green when all completed */}
              <div className="h-1.5 flex items-center justify-center">
                {hasBlocks && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isSelected
                        ? 'bg-white'
                        : allCompleted
                        ? 'bg-[#22c55e]'
                        : 'bg-[#3b82f6]'
                    )}
                  />
                )}
                {isTodayDate && !isSelected && !hasBlocks && (
                  <span className="w-1 h-1 bg-[#3b82f6] rounded-full" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
