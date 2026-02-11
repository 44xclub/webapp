'use client'

import { cn } from '@/lib/utils'

interface SquareCardProps {
  title: string
  imageUrl: string | null
  isActive?: boolean
  activeColor?: string
  onClick: () => void
  className?: string
}

export function SquareCard({ title, imageUrl, isActive, activeColor = 'var(--accent-success)', onClick, className }: SquareCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 w-[140px] h-[140px] overflow-hidden rounded-[14px] text-left transition-all duration-200 group',
        isActive && 'ring-2 ring-offset-1 ring-offset-[var(--surface-0)]',
        !isActive && 'hover:brightness-110',
        className
      )}
      style={isActive ? { '--tw-ring-color': activeColor } as React.CSSProperties : undefined}
    >
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
        {isActive && (
          <span className="pill pill--sm pill--success-solid absolute top-2 left-2 shadow-sm">Active</span>
        )}
        <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">{title}</p>
      </div>
    </button>
  )
}
