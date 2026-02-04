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
  'Initiated': { text: 'text-slate-400', bg: 'bg-slate-500/10', glow: 'shadow-none' },
  'Committed': { text: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'shadow-[0_0_16px_rgba(59,130,246,0.2)]' },
  'Elite': { text: 'text-cyan-400', bg: 'bg-cyan-500/10', glow: 'shadow-[0_0_16px_rgba(34,211,238,0.2)]' },
  'Forged': { text: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'shadow-[0_0_16px_rgba(245,158,11,0.25)]' },
  '44-Pro': { text: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' },
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const disciplineLevel = useMemo(
    () => calculateDisciplineLevel(profile.discipline_score),
    [profile.discipline_score]
  )

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const styles = badgeStyles[disciplineLevel.badge]

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.45)] mb-1">Discipline Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#eef2ff]">{profile.discipline_score}</span>
            <span className="text-[12px] text-[rgba(238,242,255,0.52)]">pts</span>
          </div>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-[12px] ${styles.bg} ${styles.glow}`}>
          <div className={`p-2 rounded-[8px] ${styles.bg}`}>
            <BadgeIcon className={`h-5 w-5 ${styles.text}`} />
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-[rgba(238,242,255,0.45)]">Level</p>
            <p className="text-[18px] font-semibold text-[#eef2ff]">{disciplineLevel.level}</p>
          </div>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] ${styles.bg} mb-4`}>
        <BadgeIcon className={`h-4 w-4 ${styles.text}`} />
        <span className={`text-[12px] font-semibold ${styles.text}`}>{disciplineLevel.badge}</span>
      </div>

      {disciplineLevel.level < 44 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-[11px] text-[rgba(238,242,255,0.45)] mb-2">
            <span className="uppercase tracking-wider">Next Level</span>
            <span className="text-[rgba(238,242,255,0.60)] font-medium">
              {disciplineLevel.scoreIntoLevel} / {disciplineLevel.toNextLevel}
            </span>
          </div>
          <div className="h-2 bg-[#1a1d21] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#a855f7] transition-all duration-700 ease-out"
              style={{ width: `${disciplineLevel.progress}%` }}
            />
          </div>
        </div>
      )}

      {disciplineLevel.level === 44 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] text-center">
          <p className="text-[12px] text-purple-400 font-semibold uppercase tracking-wider inline-block px-4 py-1 rounded-[8px] bg-purple-500/10">
            Maximum Level Achieved
          </p>
        </div>
      )}
    </div>
  )
}
