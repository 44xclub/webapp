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

  return (
    <div className="bg-card border-b border-border sticky top-0 z-30 safe-top">
      {/* Navigation row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goToPreviousWeek}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={goToToday}
          className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
        >
          Today
        </button>

        <button
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {getShortDayName(day)}
              </span>
              <span
                className={cn(
                  'text-lg font-semibold',
                  isSelected ? 'text-primary-foreground' : 'text-foreground',
                  isTodayDate && !isSelected && 'text-primary'
                )}
              >
                {getDayNumber(day)}
              </span>
              {/* Block indicator */}
              <div className="h-1.5 flex items-center justify-center">
                {hasBlocks && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isSelected
                        ? 'bg-primary-foreground'
                        : allCompleted
                        ? 'bg-green-500'
                        : 'bg-muted-foreground'
                    )}
                  />
                )}
                {isTodayDate && !isSelected && !hasBlocks && (
                  <span className="w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
