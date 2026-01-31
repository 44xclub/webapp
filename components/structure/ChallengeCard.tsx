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
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-zinc-800">
            <Target className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Community Challenge</h3>
            <p className="text-sm text-zinc-500">Monthly</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500">No active challenge this month.</p>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null
  const hasLogged = todayBlock != null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
          <Target className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-100">Community Challenge</h3>
          <p className="text-sm text-zinc-500">Monthly</p>
        </div>
        {isCompleted && (
          <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-zinc-100">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-zinc-400 mt-1">{challenge.description}</p>
          )}
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <Check className="h-4 w-4" />
            Completed today
          </div>
        ) : hasLogged ? (
          <p className="text-sm text-zinc-500">Logged - mark complete in calendar</p>
        ) : (
          <Button onClick={handleLogChallenge} disabled={logging} className="w-full">
            {logging ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging...</> : 'Log today'}
          </Button>
        )}
      </div>
    </div>
  )
}
