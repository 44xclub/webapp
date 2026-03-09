'use client'

import { useMemo } from 'react'
import { formatDayHeader } from '@/lib/date'
import { BlockRow } from './BlockRow'
import { DayProgress } from './DayProgress'
import type { Block } from '@/lib/types'

interface DayViewProps {
  date: Date
  blocks: Block[]
  onAddBlock: (date: Date) => void
  onToggleComplete: (block: Block) => void
  onEdit: (block: Block) => void
  onDuplicate: (block: Block) => void
  onDelete: (block: Block) => void
}

export function DayView({
  date,
  blocks,
  onAddBlock,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
}: DayViewProps) {
  // Filter out deleted blocks and sort by start_time, then created_at
  const sortedBlocks = useMemo(() => {
    return blocks
      .filter((block) => !block.deleted_at)
      .sort((a, b) => {
        const timeCompare = a.start_time.localeCompare(b.start_time)
        if (timeCompare !== 0) return timeCompare
        return a.created_at.localeCompare(b.created_at)
      })
  }, [blocks])

  return (
    <div className="flex flex-col">
      {/* Day header with progress */}
      <div className="px-4 py-3">
        <h2 className="text-[17px] font-semibold text-[#eef2ff]">
          {formatDayHeader(date)}
        </h2>
        <div className="mt-1">
          <DayProgress blocks={sortedBlocks} />
        </div>
      </div>

      {/* Block list with faint border container */}
      <div className="px-3">
        {sortedBlocks.length === 0 ? (
          // Empty state
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="px-4 py-12 text-center">
              <p className="text-[rgba(238,242,255,0.52)] text-[14px]">
                No blocks yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
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
          </div>
        )}
      </div>
    </div>
  )
}
