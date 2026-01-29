'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { calculateDisciplineLevel } from '@/lib/types'
import type { Profile, DisciplineBadge } from '@/lib/types'
import { Trophy, Zap, Shield, Award, Crown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderStripProps {
  profile: Profile | null
  loading?: boolean
}

const badgeIcons: Record<DisciplineBadge, typeof Trophy> = {
  'Initiated': Shield,
  'Committed': Zap,
  'Elite': Award,
  'Forged': Trophy,
  '44-Pro': Crown,
}

const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Committed': 'text-blue-400',
  'Elite': 'text-purple-400',
  'Forged': 'text-amber-400',
  '44-Pro': 'text-yellow-400',
}

export function HeaderStrip({ profile, loading }: HeaderStripProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const disciplineLevel = useMemo(
    () => profile ? calculateDisciplineLevel(profile.discipline_score) : null,
    [profile]
  )

  // Get signed URL for avatar if exists
  useEffect(() => {
    async function getAvatarUrl() {
      if (!profile?.avatar_path) {
        setAvatarUrl(null)
        return
      }

      try {
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(profile.avatar_path, 3600) // 1 hour expiry

        if (data?.signedUrl) {
          setAvatarUrl(data.signedUrl)
        }
      } catch (err) {
        console.error('Failed to get avatar URL:', err)
        setAvatarUrl(null)
      }
    }

    getAvatarUrl()
  }, [profile?.avatar_path, supabase])

  if (loading || !profile || !disciplineLevel) {
    return (
      <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-secondary rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const BadgeIcon = badgeIcons[disciplineLevel.badge]
  const displayName = profile.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Name */}
        <Link href="/profile" className="flex items-center gap-3 group">
          {/* Avatar */}
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                {initials}
              </span>
            )}
          </div>
          {/* Name */}
          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
            {displayName}
          </span>
        </Link>

        {/* Right: Badge + Score + Progress */}
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <span className={`flex items-center gap-1 text-xs font-medium ${badgeColors[disciplineLevel.badge]}`}>
            <BadgeIcon className="h-4 w-4" />
            <span>Lv.{disciplineLevel.level}</span>
          </span>

          {/* Score */}
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{profile.discipline_score}</span>
            <span className="text-xs text-muted-foreground ml-1">pts</span>
          </div>

          {/* Mini progress bar */}
          {disciplineLevel.level < 44 && (
            <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${disciplineLevel.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
