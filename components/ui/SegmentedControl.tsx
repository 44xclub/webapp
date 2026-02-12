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
      'flex bg-[rgba(255,255,255,0.05)] rounded-[12px] p-1.5 gap-1',
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 h-[42px] px-4 text-[13px] font-semibold rounded-[10px] transition-all duration-150',
            activeTab === tab.value
              ? 'bg-[#3b82f6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]'
              : 'text-[rgba(238,242,255,0.52)] hover:text-[rgba(238,242,255,0.72)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
