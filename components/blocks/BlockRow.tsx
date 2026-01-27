'use client'

import { useState, useCallback } from 'react'
import { cn, blockTypeLabels, blockTypeColors, mealTypeLabels } from '@/lib/utils'
import { formatTime } from '@/lib/date'
import { DropdownMenu } from '@/components/ui'
import { MoreHorizontal, Check } from 'lucide-react'
import type { Block, NutritionPayload, CheckinPayload } from '@/lib/types'

interface BlockRowProps {
  block: Block
  onToggleComplete: (block: Block) => void
  onEdit: (block: Block) => void
  onDuplicate: (block: Block) => void
  onDelete: (block: Block) => void
}

export function BlockRow({
  block,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
}: BlockRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const isCompleted = !!block.completed_at

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isToggling) return
      setIsToggling(true)
      await onToggleComplete(block)
      setIsToggling(false)
    },
    [block, onToggleComplete, isToggling]
  )

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const getBlockTitle = (): string => {
    if (block.title) return block.title

    // For nutrition, use meal type as title
    if (block.block_type === 'nutrition') {
      const payload = block.payload as NutritionPayload
      return payload?.meal_name || mealTypeLabels[payload?.meal_type] || 'Meal'
    }

    // For check-in, show weight
    if (block.block_type === 'checkin') {
      const payload = block.payload as CheckinPayload
      return payload?.weight ? `${payload.weight} kg` : 'Check-in'
    }

    return blockTypeLabels[block.block_type]
  }

  const getMetadata = (): string => {
    const parts: string[] = []

    // Time
    parts.push(formatTime(block.start_time))

    // Type badge
    parts.push(blockTypeLabels[block.block_type])

    // Type-specific metadata
    if (block.block_type === 'nutrition') {
      const payload = block.payload as NutritionPayload
      if (payload?.calories) {
        parts.push(`${payload.calories} cal`)
      }
    }

    if (block.block_type === 'checkin') {
      const payload = block.payload as CheckinPayload
      if (payload?.body_fat_percent) {
        parts.push(`${payload.body_fat_percent}% BF`)
      }
    }

    return parts.join(' · ')
  }

  return (
    <div
      onClick={() => onEdit(block)}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isCompleted
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/50 hover:border-primary'
        )}
        disabled={isToggling}
      >
        {isCompleted && (
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {getBlockTitle()}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              blockTypeColors[block.block_type]
            )}
          >
            {blockTypeLabels[block.block_type]}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(block.start_time)}
          </span>
          {block.block_type === 'nutrition' && (block.payload as NutritionPayload)?.calories && (
            <span className="text-xs text-muted-foreground">
              · {(block.payload as NutritionPayload).calories} cal
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="relative">
        <button
          onClick={handleMenuClick}
          className="p-2 rounded-lg hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>

        <DropdownMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: 'Edit',
              onClick: () => onEdit(block),
            },
            {
              label: 'Duplicate',
              onClick: () => onDuplicate(block),
            },
            {
              label: 'Delete',
              onClick: () => onDelete(block),
              variant: 'destructive',
            },
          ]}
        />
      </div>
    </div>
  )
}
