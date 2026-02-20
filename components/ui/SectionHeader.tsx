'use client'

import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
  className?: string
}

export function SectionHeader({ title, subtitle, action, onAction, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#eef2ff]">{title}</h3>
        {action && onAction && (
          <button
            onClick={onAction}
            className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)] transition-colors"
          >
            {action}
          </button>
        )}
      </div>
      {subtitle && (
        <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{subtitle}</p>
      )}
    </div>
  )
}
