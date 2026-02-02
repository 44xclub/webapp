'use client'

import { useMemo } from 'react'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge } from '@/lib/types'
import { Trophy, Zap, Shield, Award, Crown } from 'lucide-react'

interface ProfileCardProps {
  profile: Profile
}

const badgeIcons: Record<DisciplineBadge, typeof Trophy> = {
  'Initiated': Shield,
  'Committed': Zap,
  'Elite': Award,
  'Forged': Trophy,
  '44-Pro': Crown,
}

const badgeStyles: Record<DisciplineBadge, { text: string; bg: string; glow: string }> = {
  'Initiated': { text: 'text-steel-400', bg: 'bg-steel-800', glow: 'shadow-none' },
  'Committed': { text: 'text-accent-blue', bg: 'bg-accent-blue/10', glow: 'shadow-[0_0_16px_rgba(88,166,255,0.2)]' },
  'Elite': { text: 'text-accent-cyan', bg: 'bg-accent-cyan/10', glow: 'shadow-[0_0_16px_rgba(86,212,221,0.2)]' },
  'Forged': { text: 'text-warning', bg: 'bg-warning/10', glow: 'shadow-[0_0_16px_rgba(210,153,34,0.25)]' },
  '44-Pro': { text: 'text-accent-purple', bg: 'bg-accent-purple/10', glow: 'shadow-[0_0_20px_rgba(163,113,247,0.3)]' },
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const disciplineLevel = useMemo(
    () => calculateDisciplineLevel(profile.discipline_score),
    [profile.discipline_score]
  )

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const styles = badgeStyles[disciplineLevel.badge]

  return (
    <div className="score-display rounded-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-micro uppercase tracking-wider text-text-muted mb-1">Discipline Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-display text-foreground">{profile.discipline_score}</span>
            <span className="text-meta text-text-secondary">pts</span>
          </div>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-card ${styles.bg} ${styles.glow}`}>
          <div className={`p-2 rounded-badge ${styles.bg}`}>
            <BadgeIcon className={`h-5 w-5 ${styles.text}`} />
          </div>
          <div className="text-right">
            <p className="text-micro uppercase tracking-wider text-text-muted">Level</p>
            <p className="text-page text-foreground">{disciplineLevel.level}</p>
          </div>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-badge ${styles.bg} mb-4`}>
        <BadgeIcon className={`h-4 w-4 ${styles.text}`} />
        <span className={`text-meta font-semibold ${styles.text}`}>{disciplineLevel.badge}</span>
      </div>

      {disciplineLevel.level < 44 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-micro text-text-muted mb-2">
            <span className="uppercase tracking-wider">Next Level</span>
            <span className="text-text-secondary font-medium">
              {disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel}
            </span>
          </div>
          <div className="h-2 bg-steel-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent-purple transition-all duration-700 ease-out"
              style={{ width: `${disciplineLevel.progress}%` }}
            />
          </div>
        </div>
      )}

      {disciplineLevel.level === 44 && (
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <p className="text-meta text-accent-purple font-semibold uppercase tracking-wider energy-pulse inline-block px-4 py-1 rounded-badge bg-accent-purple/10">
            Maximum Level Achieved
          </p>
        </div>
      )}
    </div>
  )
}
