'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface HorizontalCardRowProps {
  children: ReactNode
  className?: string
}

export function HorizontalCardRow({ children, className }: HorizontalCardRowProps) {
  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto pt-1 pb-2 -mx-4 px-4 scrollbar-hide',
        className
      )}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {children}
    </div>
  )
}
