'use client'

import { cn } from '@/lib/utils'

export type ViewMode = 'day' | 'week'

interface ViewModeToggleProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-secondary p-1">
      <button
        onClick={() => onModeChange('day')}
        className={cn(
          'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
          mode === 'day'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Day
      </button>
      <button
        onClick={() => onModeChange('week')}
        className={cn(
          'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
          mode === 'week'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Week
      </button>
    </div>
  )
}
