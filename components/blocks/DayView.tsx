'use client'

import { useMemo } from 'react'
import { formatDayHeader } from '@/lib/date'
import { BlockRow } from './BlockRow'
import { DayProgress } from './DayProgress'
import { Plus } from 'lucide-react'
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

      {/* Block list */}
      <div className="px-3">
        {sortedBlocks.length === 0 ? (
          // Empty state
          <div className="rounded-xl overflow-hidden">
            <div className="px-4 py-12 text-center">
              <p className="text-[rgba(238,242,255,0.52)] text-[14px] mb-4">
                No blocks yet.
              </p>
              <button
                onClick={() => onAddBlock(date)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-[13px] font-semibold hover:bg-[#3b82f6]/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add block
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden">
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

            {/* Add block row */}
            <button
              onClick={() => onAddBlock(date)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors border-t border-[rgba(255,255,255,0.06)]"
            >
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-[rgba(238,242,255,0.30)] flex items-center justify-center">
                <Plus className="h-3 w-3 text-[rgba(238,242,255,0.52)]" />
              </div>
              <span className="text-[14px] text-[rgba(238,242,255,0.52)]">Add block</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
