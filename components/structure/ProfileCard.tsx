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

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400 bg-slate-400/10',
  'Committed': 'text-blue-400 bg-blue-400/10',
  'Elite': 'text-purple-400 bg-purple-400/10',
  'Forged': 'text-amber-400 bg-amber-400/10',
  '44-Pro': 'text-yellow-400 bg-yellow-400/10',
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const disciplineLevel = useMemo(
    () => calculateDisciplineLevel(profile.discipline_score),
    [profile.discipline_score]
  )

  const BadgeIcon = badgeIcons[disciplineLevel.badge]

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      {/* Score and Level */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Discipline Score</p>
          <p className="text-3xl font-bold text-foreground">{profile.discipline_score}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="text-xl font-bold text-foreground">{disciplineLevel.level}</p>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badgeColors[disciplineLevel.badge]}`}>
          <BadgeIcon className="h-4 w-4" />
          {disciplineLevel.badge}
        </span>
      </div>

      {/* Progress Bar */}
      {disciplineLevel.level < 44 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress to Level {disciplineLevel.level + 1}</span>
            <span>{disciplineLevel.scoreIntoLevel}/{disciplineLevel.toNextLevel}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${disciplineLevel.progress}%` }}
            />
          </div>
        </div>
      )}

      {disciplineLevel.level === 44 && (
        <div className="text-center py-2">
          <p className="text-sm text-yellow-400 font-medium">Maximum Level Achieved!</p>
        </div>
      )}
    </div>
  )
}
