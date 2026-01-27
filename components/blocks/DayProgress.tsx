'use client'

import { useMemo } from 'react'
import type { Block } from '@/lib/types'

interface DayProgressProps {
  blocks: Block[]
}

export function DayProgress({ blocks }: DayProgressProps) {
  const { completed, total, percentage } = useMemo(() => {
    const total = blocks.length
    const completed = blocks.filter((b) => b.completed_at).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percentage }
  }, [blocks])

  if (total === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {completed}/{total} completed
      </span>
      <div className="flex-1 max-w-[120px] h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
