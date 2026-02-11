'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui'
import { Target, Check } from 'lucide-react'
import type { CommunityChallenge, Block } from '@/lib/types'

interface ChallengeCardProps {
  challenge: CommunityChallenge | null
  todayBlock: Block | null
  onLogToday: () => void
  onViewPost?: () => void
}

function getImageUrl(path: string | null): string | null {
  if (!path) return null
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
}

export function ChallengeCard({ challenge, todayBlock, onLogToday, onViewPost }: ChallengeCardProps) {
  const imageUrl = useMemo(() => getImageUrl(challenge?.card_image_path ?? null), [challenge?.card_image_path])

  if (!challenge) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[8px] bg-[rgba(255,255,255,0.04)]">
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

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)]">
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

      {/* Content - Compact layout */}
      <div className="relative z-10 p-3.5">
        {/* Header row: Title + Status badge inline */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[15px] font-bold text-white leading-tight flex-1">
            {challenge.title}
          </h3>
          {isCompleted ? (
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Done</span>
            </div>
          ) : (
            <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30">
              <span className="text-[10px] font-semibold text-[#3b82f6]">Active</span>
            </div>
          )}
        </div>

        {/* Description - single line if short */}
        {challenge.description && (
          <p className="text-[11px] text-[rgba(255,255,255,0.60)] leading-snug line-clamp-1 mb-2.5">
            {challenge.description}
          </p>
        )}

        {/* Action button - compact */}
        {isCompleted ? (
          onViewPost ? (
            <Button
              onClick={onViewPost}
              variant="outline"
              size="sm"
              className="w-full h-8 text-[12px] bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              View Post
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Completed Today
            </div>
          )
        ) : (
          <Button onClick={onLogToday} size="sm" className="w-full h-8 text-[12px]">
            Log Today
          </Button>
        )}
      </div>
    </div>
  )
}
