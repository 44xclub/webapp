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
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[10px] bg-[rgba(255,255,255,0.04)]">
            <Target className="h-5 w-5 text-[rgba(238,242,255,0.30)]" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[rgba(238,242,255,0.50)]">No Active Challenge</p>
            <p className="text-[11px] text-[rgba(238,242,255,0.35)]">Check back next month</p>
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

      {/* Content */}
      <div className="relative z-10 p-4">
        {/* Status badge */}
        <div className="flex justify-end mb-8">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400">Completed</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30">
              <span className="text-[11px] font-semibold text-[#3b82f6]">Active</span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="mb-4">
          <h3 className="text-[16px] font-bold text-white mb-1.5 leading-tight">
            {challenge.title}
          </h3>
          {challenge.description && (
            <p className="text-[12px] text-[rgba(255,255,255,0.65)] leading-relaxed line-clamp-2">
              {challenge.description}
            </p>
          )}
        </div>

        {/* Action button */}
        {isCompleted ? (
          onViewPost ? (
            <Button
              onClick={onViewPost}
              variant="outline"
              size="sm"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              View Post
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-[13px] font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              Completed Today
            </div>
          )
        ) : (
          <Button onClick={onLogToday} size="sm" className="w-full">
            Log Today
          </Button>
        )}
      </div>
    </div>
  )
}
