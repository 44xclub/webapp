'use client'

import { useState, useCallback } from 'react'
import { cn, blockTypeLabels, blockTypeColors, mealTypeLabels } from '@/lib/utils'
import { formatTime } from '@/lib/date'
import { DropdownMenu } from '@/components/ui'
import { MoreHorizontal, Check } from 'lucide-react'
import type { Block, NutritionPayload, CheckinPayload, WorkoutPayload } from '@/lib/types'

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
      const payload = block.payload as unknown as NutritionPayload
      return payload?.meal_name || mealTypeLabels[payload?.meal_type] || 'Meal'
    }

    // For check-in, show weight
    if (block.block_type === 'checkin') {
      const payload = block.payload as unknown as CheckinPayload
      return payload?.weight ? `${payload.weight} kg` : 'Check-in'
    }

    return blockTypeLabels[block.block_type]
  }

  // Get secondary metadata based on block type
  const getSecondaryInfo = (): string[] => {
    const parts: string[] = []

    // Always show time first
    parts.push(formatTime(block.start_time))

    // Type-specific metadata
    if (block.block_type === 'nutrition') {
      const payload = block.payload as unknown as NutritionPayload
      if (payload?.calories) {
        parts.push(`${payload.calories} cal`)
      }
      if (payload?.protein) {
        parts.push(`${payload.protein}g protein`)
      }
    }

    if (block.block_type === 'checkin') {
      const payload = block.payload as unknown as CheckinPayload
      if (payload?.body_fat_percent) {
        parts.push(`${payload.body_fat_percent}% BF`)
      }
    }

    if (block.block_type === 'workout') {
      const payload = block.payload as unknown as WorkoutPayload
      if (payload?.duration) {
        parts.push(`${payload.duration} min`)
      }
      if (payload?.rpe) {
        parts.push(`RPE ${payload.rpe}`)
      }
    }

    return parts
  }

  return (
    <div
      onClick={() => onEdit(block)}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors',
        isCompleted && 'bg-secondary/20'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isCompleted
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
        disabled={isToggling}
      >
        {isCompleted && (
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Primary: Title - always strongest */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-semibold text-foreground truncate',
              isCompleted && 'line-through decoration-muted-foreground/50 text-muted-foreground'
            )}
          >
            {getBlockTitle()}
          </span>
        </div>
        {/* Secondary: Type badge + metadata */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              blockTypeColors[block.block_type],
              isCompleted && 'opacity-60'
            )}
          >
            {blockTypeLabels[block.block_type]}
          </span>
          <span className={cn(
            'text-xs text-muted-foreground',
            isCompleted && 'opacity-60'
          )}>
            {getSecondaryInfo().join(' · ')}
          </span>
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
