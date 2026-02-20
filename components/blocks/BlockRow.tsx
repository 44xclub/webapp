'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { cn, blockTypeLabels, mealTypeLabels } from '@/lib/utils'
import { formatTime, formatDateForApi } from '@/lib/date'
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

// Static badge color classes for each block type
const blockTypeBadgeColors: Record<string, string> = {
  workout: 'text-orange-400 bg-orange-400/10',
  habit: 'text-emerald-400 bg-emerald-400/10',
  nutrition: 'text-sky-400 bg-sky-400/10',
  checkin: 'text-violet-400 bg-violet-400/10',
  personal: 'text-rose-400 bg-rose-400/10',
  challenge: 'text-amber-400 bg-amber-400/10',
}

export function BlockRow({
  block,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
}: BlockRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isCompleted = !!block.completed_at

  // Check if block is past its end time (overdue)
  const isOverdue = useMemo(() => {
    if (isCompleted) return false

    const now = new Date()
    const todayStr = formatDateForApi(now)
    const blockDateStr = block.date

    // If block is from a past date, it's overdue
    if (blockDateStr < todayStr) return true

    // If block is from today, check the time
    if (blockDateStr === todayStr) {
      const endTime = block.end_time || block.start_time
      const [hours, minutes] = endTime.split(':').map(Number)
      const nowHours = now.getHours()
      const nowMinutes = now.getMinutes()

      // Compare times
      if (nowHours > hours) return true
      if (nowHours === hours && nowMinutes > minutes) return true
    }

    return false
  }, [block, isCompleted])

  const handleToggle = useCallback(
    async (e: React.MouseEvent | React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (isToggling) return
      setIsToggling(true)
      await onToggleComplete(block)
      setIsToggling(false)
    },
    [block, onToggleComplete, isToggling]
  )

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't open modal if clicking checkbox or menu
      if ((e.target as HTMLElement).closest('[data-checkbox]') || (e.target as HTMLElement).closest('[data-menu]')) return
      onEdit(block)
    },
    [block, onEdit]
  )

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!menuOpen && menuButtonRef.current) {
      setMenuAnchorRect(menuButtonRef.current.getBoundingClientRect())
    }
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

  // F1: Only show start–end time on home list
  const getSecondaryInfo = (): string => {
    const startStr = formatTime(block.start_time)
    if (block.end_time && block.end_time !== block.start_time) {
      const endStr = formatTime(block.end_time)
      return `${startStr} – ${endStr}`
    }
    return startStr
  }

  const badgeColors = blockTypeBadgeColors[block.block_type] || 'text-[rgba(238,242,255,0.52)] bg-[rgba(255,255,255,0.04)]'

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] touch-manipulation',
        isCompleted && 'bg-[rgba(255,255,255,0.02)]',
        isOverdue && !isCompleted && 'bg-[rgba(239,68,68,0.06)] hover:bg-[rgba(239,68,68,0.10)]',
        !isOverdue && !isCompleted && 'hover:bg-[rgba(255,255,255,0.04)]'
      )}
    >
      {/* Checkbox — separate touch target with stopPropagation */}
      <button
        data-checkbox
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-[140ms] touch-manipulation -ml-1',
          isCompleted
            ? 'bg-[#3b82f6] border-[#3b82f6]'
            : isOverdue
              ? 'border-[rgba(239,68,68,0.5)] hover:border-[#ef4444]'
              : 'border-[rgba(255,255,255,0.20)] hover:border-[#3b82f6]'
        )}
        disabled={isToggling}
      >
        {isCompleted && (
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Primary: Title - always strongest */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-semibold text-[15px] truncate',
              isCompleted && 'line-through decoration-[rgba(238,242,255,0.3)] text-[rgba(238,242,255,0.52)]',
              !isCompleted && 'text-[#eef2ff]'
            )}
          >
            {getBlockTitle()}
          </span>
          {isOverdue && !isCompleted && (
            <span className="text-[10px] font-semibold text-[#ef4444]">Overdue</span>
          )}
        </div>
        {/* Secondary: Type badge + time only */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-[6px] font-semibold',
              isCompleted ? 'text-[rgba(238,242,255,0.52)] bg-[rgba(255,255,255,0.04)] opacity-60' : badgeColors
            )}
          >
            {blockTypeLabels[block.block_type]}
          </span>
          <span className={cn(
            'text-[12px] text-[rgba(238,242,255,0.52)]',
            isCompleted && 'opacity-60'
          )}>
            {getSecondaryInfo()}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="relative" data-menu>
        <button
          ref={menuButtonRef}
          onClick={handleMenuClick}
          className="p-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.05)] sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-[140ms] touch-manipulation"
        >
          <MoreHorizontal className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
        </button>

        <DropdownMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRect={menuAnchorRect}
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
