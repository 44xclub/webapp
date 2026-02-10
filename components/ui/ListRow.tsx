'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label: string
  meta?: string
  value?: React.ReactNode
  showChevron?: boolean
  href?: string
}

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(
  ({ className, icon, label, meta, value, showChevron = true, href, onClick, ...props }, ref) => {
    const content = (
      <>
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-label truncate">{label}</div>
          {meta && <div className="text-meta truncate">{meta}</div>}
        </div>
        {value && <div className="flex-shrink-0 text-meta">{value}</div>}
        {showChevron && (
          <ChevronRight className="flex-shrink-0 w-4 h-4 text-[var(--text-muted)]" />
        )}
      </>
    )

    if (href) {
      return (
        <a
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={cn('list-row no-underline', className)}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      )
    }

    return (
      <div
        ref={ref}
        className={cn('list-row', className)}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...props}
      >
        {content}
      </div>
    )
  }
)

ListRow.displayName = 'ListRow'
