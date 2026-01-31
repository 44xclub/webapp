'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile } from '@/lib/types'

/*
  44CLUB Header Strip
  Elite. Controlled. Status display only.

  Structure: [ Profile ] Name | Level · Points
  - No progress bars
  - No decorative icons
  - Subtle gradient background
*/

interface HeaderStripProps {
  profile: Profile | null
  loading?: boolean
}

export function HeaderStrip({ profile, loading }: HeaderStripProps) {
  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  if (loading || !profile || !disciplineLevel) {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-b from-canvas-deep to-canvas border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-surface rounded-[10px] animate-pulse" />
            <div className="h-4 w-20 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-surface rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-b from-canvas-deep to-canvas border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Profile + Name */}
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-[10px] bg-surface border border-border flex items-center justify-center group-hover:border-accent/50 transition-colors">
            <span className="text-secondary text-text-primary font-medium">{initials}</span>
          </div>
          <span className="text-body text-text-primary font-medium group-hover:text-accent transition-colors">
            {displayName}
          </span>
        </Link>

        {/* Right: Level · Points */}
        <div className="flex items-center gap-1 text-secondary">
          <span className="text-text-secondary">Level {disciplineLevel.level}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-primary font-medium">{profile.discipline_score} pts</span>
        </div>
      </div>
    </div>
  )
}
