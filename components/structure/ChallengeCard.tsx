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
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Community Challenge</h3>
            <p className="text-sm text-muted-foreground">Monthly</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No active challenge this month. Check back soon!
        </p>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null
  const hasLogged = todayBlock != null

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Community Challenge</h3>
          <p className="text-sm text-muted-foreground">Monthly</p>
        </div>
        {isCompleted && (
          <div className="p-1.5 rounded-full bg-green-500/10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-foreground">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
          )}
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
            <Check className="h-4 w-4" />
            Completed today!
          </div>
        ) : hasLogged ? (
          <div className="text-sm text-muted-foreground">
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
