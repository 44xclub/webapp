'use client'

import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { cn, blockTypeColors } from '@/lib/utils'
import { formatTime, formatDateForApi, isSameDayDate } from '@/lib/date'
import { ChevronRight } from 'lucide-react'
import type { Block } from '@/lib/types'

interface WeekOverviewProps {
  weekDays: Date[]
  blocksByDate: Map<string, Block[]>
  selectedDate: Date
  onSelectDay: (date: Date) => void
  onEditBlock: (block: Block) => void
}

export function WeekOverview({
  weekDays,
  blocksByDate,
  selectedDate,
  onSelectDay,
  onEditBlock,
}: WeekOverviewProps) {
  return (
    <div className="px-3 space-y-2">
      {weekDays.map((day) => {
        const dateKey = formatDateForApi(day)
        const blocks = (blocksByDate.get(dateKey) || []).filter(
          (b) => !b.deleted_at
        )
        const isSelected = isSameDayDate(day, selectedDate)
        const isTodayDate = isToday(day)

        return (
          <WeekDayRow
            key={dateKey}
            date={day}
            blocks={blocks}
            isSelected={isSelected}
            isToday={isTodayDate}
            onSelectDay={onSelectDay}
            onEditBlock={onEditBlock}
          />
        )
      })}
    </div>
  )
}

interface WeekDayRowProps {
  date: Date
  blocks: Block[]
  isSelected: boolean
  isToday: boolean
  onSelectDay: (date: Date) => void
  onEditBlock: (block: Block) => void
}

function WeekDayRow({
  date,
  blocks,
  isSelected,
  isToday,
  onSelectDay,
  onEditBlock,
}: WeekDayRowProps) {
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [blocks])

  const completedCount = blocks.filter((b) => b.completed_at).length
  const totalCount = blocks.length
  const displayBlocks = sortedBlocks.slice(0, 3)
  const remainingCount = sortedBlocks.length - displayBlocks.length

  return (
    <div
      className={cn(
        'bg-card rounded-xl border overflow-hidden transition-colors',
        isSelected ? 'border-primary' : 'border-border',
        isToday && !isSelected && 'border-primary/50'
      )}
    >
      {/* Day header row - clickable to switch to day view */}
      <button
        onClick={() => onSelectDay(date)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <span
              className={cn(
                'text-sm font-medium',
                isToday ? 'text-primary' : 'text-foreground'
              )}
            >
              {format(date, 'EEE')}
            </span>
            <span
              className={cn(
                'text-lg font-semibold',
                isToday ? 'text-primary' : 'text-foreground'
              )}
            >
              {format(date, 'd')}
            </span>
          </div>
          {isToday && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{totalCount} blocks</span>
              <span className="text-primary">{completedCount} done</span>
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {/* Block previews */}
      {sortedBlocks.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {displayBlocks.map((block) => (
            <button
              key={block.id}
              onClick={(e) => {
                e.stopPropagation()
                onEditBlock(block)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 transition-colors text-left',
                block.completed_at && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  blockTypeColors[block.block_type]
                    .replace('text-', 'bg-')
                    .replace(' bg-', ' ')
                    .split(' ')[0]
                    .replace('bg-', 'bg-')
                )}
                style={{
                  backgroundColor: getBlockDotColor(block.block_type),
                }}
              />
              <span
                className={cn(
                  'flex-1 text-sm truncate',
                  block.completed_at && 'line-through text-muted-foreground'
                )}
              >
                {block.title || getBlockDefaultTitle(block)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(block.start_time)}
              </span>
            </button>
          ))}

          {remainingCount > 0 && (
            <button
              onClick={() => onSelectDay(date)}
              className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors text-left"
            >
              +{remainingCount} more
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {sortedBlocks.length === 0 && (
        <button
          onClick={() => onSelectDay(date)}
          className="w-full border-t border-border px-4 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors text-left"
        >
          No blocks
        </button>
      )}
    </div>
  )
}

function getBlockDotColor(blockType: string): string {
  const colors: Record<string, string> = {
    workout: '#fb923c', // orange-400
    habit: '#4ade80', // green-400
    nutrition: '#60a5fa', // blue-400
    checkin: '#22d3ee', // cyan-400
    personal: '#f472b6', // pink-400
  }
  return colors[blockType] || '#9ca3af'
}

function getBlockDefaultTitle(block: Block): string {
  const labels: Record<string, string> = {
    workout: 'Workout',
    habit: 'Habit',
    nutrition: 'Meal',
    checkin: 'Check-in',
    personal: 'Personal',
  }
  return labels[block.block_type] || 'Block'
}
