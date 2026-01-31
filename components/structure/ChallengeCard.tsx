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

export function ChallengeCard({
  challenge,
  todayBlock,
  onLogChallenge,
  onRefetch,
}: ChallengeCardProps) {
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
      <div className="bg-[#0d1117] rounded-2xl p-5 border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-white/5">
            <Target className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Community Challenge</h3>
            <p className="text-sm text-gray-500">Monthly</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          No active challenge this month. Check back soon!
        </p>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null
  const hasLogged = todayBlock != null

  return (
    <div className="bg-[#0d1117] rounded-2xl p-5 border border-white/5 hover:border-blue-500/20 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10">
          <Target className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Community Challenge</h3>
          <p className="text-sm text-gray-500">Monthly</p>
        </div>
        {isCompleted && (
          <div className="p-2 rounded-full bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-white">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-gray-400 mt-1">{challenge.description}</p>
          )}
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <Check className="h-4 w-4" />
            Completed today!
          </div>
        ) : hasLogged ? (
          <div className="text-sm text-gray-500">
            Logged for today - mark as complete in your calendar
          </div>
        ) : (
          <Button
            onClick={handleLogChallenge}
            disabled={logging}
            className="w-full"
          >
            {logging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              'Log today'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
