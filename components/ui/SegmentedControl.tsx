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
    <div className={cn('flex bg-[rgba(255,255,255,0.04)] rounded-[10px] p-[3px] gap-[2px]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 py-[7px] text-[13px] font-semibold rounded-[8px] transition-all duration-150',
            activeTab === tab.value
              ? 'bg-[rgba(255,255,255,0.09)] text-[#eef2ff] shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              : 'text-[rgba(238,242,255,0.42)] hover:text-[rgba(238,242,255,0.62)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
