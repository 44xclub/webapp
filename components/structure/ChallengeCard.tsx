'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui'
import { Target, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunityChallenge, Block } from '@/lib/types'

interface ChallengeCardProps {
  challenge: CommunityChallenge | null
  todayBlock: Block | null
  onLogToday: () => void
  onViewPost?: () => void
  /** 'full' for Structure page, 'compact' for Home page */
  variant?: 'full' | 'compact'
}

function getImageUrl(path: string | null): string | null {
  if (!path) return null
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
}

export function ChallengeCard({ challenge, todayBlock, onLogToday, onViewPost, variant = 'full' }: ChallengeCardProps) {
  const imageUrl = useMemo(() => getImageUrl(challenge?.card_image_path ?? null), [challenge?.card_image_path])
  const isCompact = variant === 'compact'

  if (!challenge) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-3 h-[64px] flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[var(--radius-button)] bg-[rgba(255,255,255,0.04)]">
            <Target className="h-4 w-4 text-[rgba(238,242,255,0.30)]" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[rgba(238,242,255,0.50)]">No Active Challenge</p>
            <p className="text-[10px] text-[rgba(238,242,255,0.35)]">Check back next month</p>
          </div>
        </div>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null

  // Compact variant - horizontal layout for Home page
  if (isCompact) {
    return (
      <button
        onClick={isCompleted ? onViewPost : onLogToday}
        className="w-full relative overflow-hidden rounded-[12px] h-[64px] border border-[rgba(255,255,255,0.08)] text-left hover:border-[rgba(255,255,255,0.12)] active:border-[rgba(255,255,255,0.16)] transition-colors"
      >
        {/* Background */}
        {imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />

        {/* Content */}
        <div className="relative z-10 p-3 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <p className="text-[12px] font-semibold text-white leading-tight truncate flex-1">
              {challenge.title}
            </p>
            {isCompleted && (
              <span className="pill pill--sm pill--success flex-shrink-0 ml-1.5">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-auto">
            <Target className="h-3 w-3 text-white/40" />
            <span className="text-[10px] font-medium text-white/50">
              {isCompleted ? 'Done today' : 'Log today'}
            </span>
          </div>
        </div>
      </button>
    )
  }

  // Full variant - vertical layout for Structure page
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-section)] border border-[rgba(255,255,255,0.08)]">
      {/* Background image or gradient */}
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
      )}

      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative z-10 p-3">
        {/* Header row: Title + Status badge inline */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h3 className="text-[14px] font-semibold text-white leading-tight flex-1 truncate">
            {challenge.title}
          </h3>
          {isCompleted ? (
            <span className="pill pill--success flex-shrink-0">
              <Check className="h-3 w-3" />
              Done
            </span>
          ) : (
            <span className="pill pill--primary flex-shrink-0">Active</span>
          )}
        </div>

        {/* Description - max 2 lines */}
        {challenge.description && (
          <p className="text-[12px] text-[rgba(255,255,255,0.55)] leading-snug line-clamp-2 mb-2.5">
            {challenge.description}
          </p>
        )}

        {/* Action button - full width CTA */}
        {isCompleted ? (
          onViewPost ? (
            <Button
              onClick={onViewPost}
              variant="outline"
              size="sm"
              className="w-full h-9 text-[12px] bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              View Post
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-medium text-[var(--accent-success-light)]">
              <Check className="h-3.5 w-3.5" />
              Completed Today
            </div>
          )
        ) : (
          <Button onClick={onLogToday} size="sm" className="w-full h-9 text-[12px]">
            Log Today
          </Button>
        )}
      </div>
    </div>
  )
}
