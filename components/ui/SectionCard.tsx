'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: React.ReactNode
  noPadding?: boolean
}

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, title, action, noPadding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('section-card', noPadding && 'p-0', className)}
        {...props}
      >
        {(title || action) && (
          <div className={cn('section-header', noPadding && 'px-4 pt-4')}>
            {title && <h2 className="section-title">{title}</h2>}
            {action && <div>{action}</div>}
          </div>
        )}
        {children}
      </div>
    )
  }
)

SectionCard.displayName = 'SectionCard'
