'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Target, Check, Loader2 } from 'lucide-react'
import type { CommunityChallenge, Block } from '@/lib/types'

interface ChallengeCardProps {
  challenge: CommunityChallenge | null
  todayBlock: Block | null
  onLogChallenge: () => Promise<Block>
  onRefetch: () => void
}

export function ChallengeCard({ challenge, todayBlock, onLogChallenge, onRefetch }: ChallengeCardProps) {
  const [logging, setLogging] = useState(false)

  const handleLogChallenge = async () => {
    setLogging(true)
    try {
      await onLogChallenge()
      onRefetch()
    } catch (err) {
      console.error('Failed to log challenge:', err)
    } finally {
      setLogging(false)
    }
  }

  if (!challenge) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[8px] bg-[rgba(255,255,255,0.04)]">
            <Target className="h-4 w-4 text-[rgba(238,242,255,0.30)]" />
          </div>
          <p className="text-[12px] text-[rgba(238,242,255,0.40)]">No active challenge this month.</p>
        </div>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null
  const hasLogged = todayBlock != null

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-3.5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-1.5 rounded-[8px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.12)]">
          <Target className="h-4 w-4 text-[#3b82f6]" />
        </div>
        <div className="flex-1">
          <h4 className="text-[13px] font-semibold text-[rgba(238,242,255,0.90)]">{challenge.title}</h4>
        </div>
        {isCompleted && (
          <div className="p-1 rounded-[6px] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.12)]">
            <Check className="h-3.5 w-3.5 text-[#22c55e]" />
          </div>
        )}
      </div>

      {challenge.description && (
        <p className="text-[12px] text-[rgba(238,242,255,0.45)] leading-relaxed mb-3">{challenge.description}</p>
      )}

      {isCompleted ? (
        <div className="flex items-center gap-1.5 text-[12px] text-[#22c55e] font-medium">
          <Check className="h-3.5 w-3.5" />
          Completed today
        </div>
      ) : hasLogged ? (
        <p className="text-[11px] text-[rgba(238,242,255,0.35)]">Logged - mark complete in calendar</p>
      ) : (
        <Button onClick={handleLogChallenge} disabled={logging} size="sm" className="w-full">
          {logging ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Logging...</> : 'Log today'}
        </Button>
      )}
    </div>
  )
}
