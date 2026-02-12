'use client'

import { cn } from '@/lib/utils'

interface SegmentedControlProps {
  tabs: { value: string; label: string }[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ tabs, activeTab, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn(
      'flex bg-[rgba(255,255,255,0.05)] rounded-[var(--radius-card)] p-1 gap-1 safe-x',
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 h-[32px] px-4 text-[12px] font-semibold rounded-[var(--radius-button)] transition-all duration-150',
            activeTab === tab.value
              ? 'bg-[var(--accent-primary)] text-white'
              : 'text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.65)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
