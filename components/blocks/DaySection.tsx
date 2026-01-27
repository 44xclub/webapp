'use client'

import { useMemo, forwardRef } from 'react'
import { formatDayHeader, formatDateForApi } from '@/lib/date'
import { BlockRow } from './BlockRow'
import { Plus } from 'lucide-react'
import type { Block } from '@/lib/types'

interface DaySectionProps {
  date: Date
  blocks: Block[]
  onAddBlock: (date: Date) => void
  onToggleComplete: (block: Block) => void
  onEdit: (block: Block) => void
  onDuplicate: (block: Block) => void
  onDelete: (block: Block) => void
}

export const DaySection = forwardRef<HTMLDivElement, DaySectionProps>(
  (
    {
      date,
      blocks,
      onAddBlock,
      onToggleComplete,
      onEdit,
      onDuplicate,
      onDelete,
    },
    ref
  ) => {
    // Filter out deleted blocks and sort by start_time, then created_at
    const sortedBlocks = useMemo(() => {
      return blocks
        .filter((block) => !block.deleted_at)
        .sort((a, b) => {
          // First sort by start_time
          const timeCompare = a.start_time.localeCompare(b.start_time)
          if (timeCompare !== 0) return timeCompare

          // Then by created_at
          return a.created_at.localeCompare(b.created_at)
        })
    }, [blocks])

    const dateKey = formatDateForApi(date)

    return (
      <div ref={ref} data-date={dateKey} className="mb-4">
        {/* Day header */}
        <div className="px-4 py-2 sticky top-[108px] bg-background/95 backdrop-blur-sm z-10">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {formatDayHeader(date)}
          </h2>
        </div>

        {/* Block list */}
        <div className="bg-card rounded-xl mx-3 overflow-hidden border border-border">
          {sortedBlocks.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No blocks for this day
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedBlocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}

          {/* Add block row */}
          <button
            onClick={() => onAddBlock(date)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-t border-border"
          >
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
              <Plus className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Add block</span>
          </button>
        </div>
      </div>
    )
  }
)

DaySection.displayName = 'DaySection'
