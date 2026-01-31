'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Target, Check, Loader2 } from 'lucide-react'
import type { CommunityChallenge, Block } from '@/lib/types'

/*
  44CLUB Challenge Card
  Stoic. Controlled. Status display.
*/

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
      <div className="bg-surface border border-border rounded-[16px] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-[10px] bg-canvas-card">
            <Target className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-text-primary">Community Challenge</h3>
            <p className="text-secondary text-text-muted">Monthly</p>
          </div>
        </div>
        <p className="text-secondary text-text-muted">No active challenge this month.</p>
      </div>
    )
  }

  const isCompleted = todayBlock?.completed_at != null
  const hasLogged = todayBlock != null

  return (
    <div className="bg-surface border border-border rounded-[16px] p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-[10px] bg-accent/10 border border-accent/20">
          <Target className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-body font-semibold text-text-primary">Community Challenge</h3>
          <p className="text-secondary text-text-muted">Monthly</p>
        </div>
        {isCompleted && (
          <div className="p-1.5 rounded-[10px] bg-success/10 border border-success/20">
            <Check className="h-4 w-4 text-success" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-body font-medium text-text-primary">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-secondary text-text-secondary mt-1">{challenge.description}</p>
          )}
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-2 text-secondary text-success font-medium">
            <Check className="h-4 w-4" />
            Completed today
          </div>
        ) : hasLogged ? (
          <p className="text-secondary text-text-muted">Logged - mark complete in calendar</p>
        ) : (
          <Button onClick={handleLogChallenge} disabled={logging} className="w-full">
            {logging ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging...</> : 'Log today'}
          </Button>
        )}
      </div>
    </div>
  )
}
