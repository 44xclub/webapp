'use client'

import { useMemo, useCallback } from 'react'
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
import { isToday, format } from 'date-fns'
import type { Block } from '@/lib/types'
import type { ViewMode } from './ViewModeToggle'

interface WeekStripProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onWeekChange: (date: Date) => void
  blocksByDate?: Map<string, Block[]>
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

export function WeekStrip({
  selectedDate,
  onSelectDate,
  onWeekChange,
  blocksByDate,
  viewMode = 'day',
  onViewModeChange,
}: WeekStripProps) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const today = useMemo(() => new Date(), [])

  // Week label: "Week of Feb 9–15" or "Week of Jan 27 – Feb 2" (cross-month)
  const weekLabel = useMemo(() => {
    const start = weekDays[0]
    const end = weekDays[6]
    const startMonth = format(start, 'MMM')
    const endMonth = format(end, 'MMM')
    if (startMonth === endMonth) {
      return `Week of ${startMonth} ${start.getDate()}–${end.getDate()}`
    }
    return `Week of ${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`
  }, [weekDays])

  // Arrows ALWAYS change week, maintaining weekday index
  const goBack = useCallback(() => {
    const newDate = getPreviousWeek(selectedDate)
    onWeekChange(newDate)
    onSelectDate(newDate)
  }, [selectedDate, onWeekChange, onSelectDate])

  const goForward = useCallback(() => {
    const newDate = getNextWeek(selectedDate)
    onWeekChange(newDate)
    onSelectDate(newDate)
  }, [selectedDate, onWeekChange, onSelectDate])

  // Clicking the active mode button resets to today
  const handleModeClick = useCallback((mode: ViewMode) => {
    if (viewMode === mode) {
      onSelectDate(today)
      onWeekChange(today)
    } else {
      onViewModeChange?.(mode)
    }
  }, [viewMode, onSelectDate, onWeekChange, onViewModeChange, today])

  return (
    <div className="bg-[#07090d] border-b border-[rgba(255,255,255,0.07)]">
      {/* Single row: ← Week of Feb 9–15  [Day|Week]  → */}
      <div className="flex items-center px-2 py-1.5">
        <button
          onClick={goBack}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-[13px] font-semibold text-[rgba(238,242,255,0.72)]">
            {weekLabel}
          </span>
          {onViewModeChange && (
            <div className="flex bg-[rgba(255,255,255,0.05)] rounded-[var(--radius-button)] p-0.5 h-[28px]">
              <button
                onClick={() => handleModeClick('day')}
                className={cn(
                  'px-3.5 rounded-[calc(var(--radius-button)-2px)] text-[11px] font-semibold transition-all duration-150',
                  viewMode === 'day'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.65)]'
                )}
              >
                Day
              </button>
              <button
                onClick={() => handleModeClick('week')}
                className={cn(
                  'px-3.5 rounded-[calc(var(--radius-button)-2px)] text-[11px] font-semibold transition-all duration-150',
                  viewMode === 'week'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.65)]'
                )}
              >
                Week
              </button>
            </div>
          )}
        </div>
        <button
          onClick={goForward}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
        </button>
      </div>

      {/* 7 Day Cards - compact, 8px spacing between */}
      <div className="flex justify-around px-1.5 pb-2 gap-[8px]">
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
                'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg min-w-[40px] min-h-[44px] transition-all',
                isSelected
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'hover:bg-[rgba(255,255,255,0.04)]'
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-medium uppercase',
                  isSelected ? 'text-white/90' : 'text-[rgba(238,242,255,0.45)]'
                )}
              >
                {getShortDayName(day)}
              </span>
              <span
                className={cn(
                  'text-[15px] font-semibold leading-tight',
                  isSelected ? 'text-white' : 'text-[#eef2ff]',
                  isTodayDate && !isSelected && 'text-[var(--accent-primary)]'
                )}
              >
                {getDayNumber(day)}
              </span>
              {/* Block indicator */}
              <div className="h-1 flex items-center justify-center">
                {hasBlocks && (
                  <span
                    className={cn(
                      'w-1 h-1 rounded-full',
                      isSelected
                        ? 'bg-white/80'
                        : allCompleted
                        ? 'bg-[#22c55e]'
                        : 'bg-[var(--accent-primary)]'
                    )}
                  />
                )}
                {isTodayDate && !isSelected && !hasBlocks && (
                  <span className="w-1 h-1 bg-[var(--accent-primary)]/60 rounded-full" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
