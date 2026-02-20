import { WHOP_API_BASE, getWhopApiKey, getWhopChannelId } from './config'
import type { WorkoutPayload } from '@/lib/types/database'

interface WorkoutCompletionInfo {
  displayName: string
  workoutTitle: string | null
  payload: Record<string, unknown>
}

/**
 * Format the Whop chat message for a completed workout.
 * Follows 44CLUB tone: short, skimmable, no spam.
 */
export function formatWorkoutMessage(info: WorkoutCompletionInfo): string {
  const name = info.displayName || 'A member'
  const title = info.workoutTitle

  const wp = info.payload as Partial<WorkoutPayload>
  const parts: string[] = []

  if (wp.duration) parts.push(`${wp.duration} min`)
  if (wp.rpe) parts.push(`RPE ${wp.rpe}`)

  if (title) {
    const suffix = parts.length > 0 ? ` — ${parts.join(' — ')}` : ''
    return `✅ ${name} completed: ${title}${suffix}`
  }

  return `✅ ${name} completed a workout.`
}

/**
 * Post a message to the configured Whop workout log channel.
 * Returns the created message ID on success, or throws on failure.
 */
export async function postWorkoutCompletion(info: WorkoutCompletionInfo): Promise<string> {
  const apiKey = getWhopApiKey()
  const channelId = getWhopChannelId()
  const body = formatWorkoutMessage(info)

  const response = await fetch(`${WHOP_API_BASE}/chat/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      feed_id: channelId,
      body,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown')
    throw new Error(`Whop chat API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.id || 'sent'
}
