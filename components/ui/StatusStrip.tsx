'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface StatusStripProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  action?: React.ReactNode
}

export const StatusStrip = forwardRef<HTMLDivElement, StatusStripProps>(
  ({ className, icon, label, value, action, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('status-strip', className)} {...props}>
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex-shrink-0 text-[var(--text-secondary)]">
              {icon}
            </div>
          )}
          <span className="text-meta">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-label font-semibold">{value}</span>
          {action}
        </div>
      </div>
    )
  }
)

StatusStrip.displayName = 'StatusStrip'
