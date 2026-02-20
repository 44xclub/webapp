/**
 * Whop integration configuration.
 * All secrets are server-side only (no NEXT_PUBLIC_ prefix).
 */

export const WHOP_API_BASE = 'https://api.whop.com/api/v5'

export function getWhopApiKey(): string {
  const key = process.env.WHOP_API_KEY
  if (!key) throw new Error('Missing WHOP_API_KEY environment variable')
  return key
}

export function getWhopClientSecret(): string {
  const secret = process.env.WHOP_CLIENT_SECRET
  if (!secret) throw new Error('Missing WHOP_CLIENT_SECRET environment variable')
  return secret
}

export function getWhopChannelId(): string {
  const id = process.env.WHOP_WORKOUT_LOG_CHANNEL_ID
  if (!id) throw new Error('Missing WHOP_WORKOUT_LOG_CHANNEL_ID environment variable')
  return id
}
