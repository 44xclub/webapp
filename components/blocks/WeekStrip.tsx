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
  viewMode,
  onViewModeChange,
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
    <div className="bg-[#07090d] border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-30 safe-top">
      {/* Compact navigation row with Today + View Toggle */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-[11px] font-semibold bg-[rgba(59,130,246,0.10)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.16)] rounded-md transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
          </button>
        </div>

        {/* Integrated compact view toggle */}
        {viewMode && onViewModeChange && (
          <div className="flex bg-[rgba(255,255,255,0.04)] rounded-md p-0.5">
            <button
              onClick={() => onViewModeChange('day')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded transition-all',
                viewMode === 'day'
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.72)]'
              )}
            >
              Day
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded transition-all',
                viewMode === 'week'
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.72)]'
              )}
            >
              Week
            </button>
          </div>
        )}
      </div>

      {/* Compact week days - tighter spacing, smaller pills */}
      <div className="flex justify-around px-1.5 pb-2">
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
                  ? 'bg-[#3b82f6] text-white'
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
                  isTodayDate && !isSelected && 'text-[#3b82f6]'
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
                        : 'bg-[#3b82f6]'
                    )}
                  />
                )}
                {isTodayDate && !isSelected && !hasBlocks && (
                  <span className="w-1 h-1 bg-[#3b82f6]/60 rounded-full" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
