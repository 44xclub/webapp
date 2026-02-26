// =====================================================
// VoiceCaptureService — Strategy routing module
// =====================================================
//
// Single entry point for voice capture. Routes between:
//   Mode A (inline): getUserMedia + MediaRecorder inside the app
//   Mode B (breakout): external /voice-capture page in system browser
//
// API:
//   startVoiceFlow() → VoiceFlowResult
//   checkBreakoutReturn() → BreakoutResumeResult | null
//   pollSessionResult(sessionId, headers) → SessionPollResult

import {
  startMediaRecorder,
  type MediaRecorderHandle,
  type VoiceCaptureError,
} from './capture'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type InlineFailureReason =
  | 'policy_block'       // Permissions Policy / iframe denied mic
  | 'instant_rejection'  // getUserMedia rejected in <100ms — container-level block
  | 'not_supported'      // No getUserMedia or MediaRecorder
  | 'insecure_context'   // Not HTTPS
  | 'user_denied'        // User explicitly denied mic permission (>100ms)

export interface VoiceFlowInline {
  mode: 'inline'
  handle: MediaRecorderHandle
}

export interface VoiceFlowBreakout {
  mode: 'breakout_needed'
  reason: InlineFailureReason
  message: string
}

export type VoiceFlowResult = VoiceFlowInline | VoiceFlowBreakout

export interface SessionPollResult {
  status: 'created' | 'uploaded' | 'transcribed' | 'parsed' | 'failed' | 'expired'
  transcript?: string | null
  proposed_action?: Record<string, unknown> | null
  summary_text?: string | null
  command_id?: string | null
  mode?: string | null
  resolved_datetime?: string | null
  needs_clarification?: string[]
  confidence?: number | null
  error_message?: string | null
}

export interface BreakoutSession {
  session_id: string
  capture_url: string
}

// ------------------------------------------------------------------
// Environment pre-detection
// ------------------------------------------------------------------

/**
 * Detect whether inline mic capture is almost certainly blocked.
 * Runs once on mount — result is read synchronously in the tap handler.
 */
export function detectInlineBlocked(): InlineFailureReason | null {
  if (typeof window === 'undefined') return null

  const isIframe = window.self !== window.top
  if (!isIframe) return null

  // Check Permissions Policy APIs
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pp = (document as any).permissionsPolicy
    if (pp?.allowsFeature && !pp.allowsFeature('microphone')) {
      return 'policy_block'
    }
  } catch { /* not available */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fp = (document as any).featurePolicy
    if (fp?.allowsFeature && !fp.allowsFeature('microphone')) {
      return 'policy_block'
    }
  } catch { /* not available */ }

  // No getUserMedia at all
  if (!navigator.mediaDevices?.getUserMedia) return 'not_supported'

  // Heuristic: mobile webview inside iframe
  const ua = navigator.userAgent
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
  const isWebView =
    (/(iPhone|iPad|iPod)/.test(ua) && !/Safari/i.test(ua)) ||
    /wv\)/.test(ua) ||
    /FBAN|FBAV|Instagram|WhopApp/i.test(ua)

  if (isMobile && isWebView) return 'policy_block'

  // Mobile + iframe + no Permissions Policy API = can't confirm mic is allowed
  if (isMobile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasPolicyAPI = !!(document as any).permissionsPolicy || !!(document as any).featurePolicy
    if (!hasPolicyAPI) return 'policy_block'
  }

  return null
}

// ------------------------------------------------------------------
// Inline failure classification
// ------------------------------------------------------------------

function classifyInlineFailure(err: VoiceCaptureError, durationMs: number): InlineFailureReason {
  // Instant rejection (<100ms) = container-level policy denial
  if (durationMs < 100 && (err.code === 'permission_denied' || err.code === 'blocked_by_policy')) {
    return 'instant_rejection'
  }

  switch (err.code) {
    case 'blocked_by_policy':
      return 'policy_block'
    case 'not_supported':
      return 'not_supported'
    case 'insecure_context':
      return 'insecure_context'
    case 'permission_denied':
      return 'user_denied'
    default:
      return 'policy_block' // err on side of breakout
  }
}

function failureMessage(reason: InlineFailureReason): string {
  switch (reason) {
    case 'policy_block':
    case 'instant_rejection':
      return "Whop's embedded view doesn't support microphone access. Opening external recorder..."
    case 'not_supported':
      return 'Audio recording is not supported in this browser. Opening external recorder...'
    case 'insecure_context':
      return 'Microphone requires a secure (HTTPS) connection. Opening external recorder...'
    case 'user_denied':
      return 'Microphone permission was denied.'
  }
}

// ------------------------------------------------------------------
// Main flow
// ------------------------------------------------------------------

/**
 * Attempt inline voice capture. If it fails with a policy/support error,
 * returns a breakout_needed result instead of throwing.
 *
 * IMPORTANT: Call this directly inside a user gesture handler (click/tap).
 */
export async function startVoiceFlow(): Promise<VoiceFlowResult> {
  // Pre-check: if we already know inline is blocked, skip getUserMedia
  const preBlock = detectInlineBlocked()
  if (preBlock) {
    return {
      mode: 'breakout_needed',
      reason: preBlock,
      message: failureMessage(preBlock),
    }
  }

  // Attempt inline capture with timing
  const start = performance.now()
  try {
    const handle = await startMediaRecorder()
    return { mode: 'inline', handle }
  } catch (err) {
    const duration = performance.now() - start
    const captureErr = err as VoiceCaptureError
    const reason = classifyInlineFailure(captureErr, duration)

    return {
      mode: 'breakout_needed',
      reason,
      message: failureMessage(reason),
    }
  }
}

// ------------------------------------------------------------------
// Breakout session helpers
// ------------------------------------------------------------------

/**
 * Create a breakout capture session via the API.
 */
export async function createBreakoutSession(
  headers: Record<string, string>
): Promise<BreakoutSession> {
  const returnUrl = window.location.href
  const res = await fetch('/api/voice/capture-session', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_url: returnUrl }),
  })

  if (!res.ok) {
    throw new Error('Failed to create capture session')
  }

  const data = await res.json()
  return {
    session_id: data.session_id,
    capture_url: data.capture_url,
  }
}

/**
 * Poll for session result.
 */
export async function pollSessionResult(
  sessionId: string,
  headers: Record<string, string>
): Promise<SessionPollResult> {
  const res = await fetch(`/api/voice/session-result?session_id=${sessionId}`, {
    headers,
  })

  if (!res.ok) {
    throw new Error('Failed to fetch session result')
  }

  return res.json()
}

// ------------------------------------------------------------------
// Breakout return detection
// ------------------------------------------------------------------

const VOICE_SESSION_STORAGE_KEY = 'last_voice_session_id'

/**
 * Save session ID to localStorage for recovery.
 */
export function persistSessionId(sessionId: string): void {
  try {
    localStorage.setItem(VOICE_SESSION_STORAGE_KEY, sessionId)
  } catch { /* storage may be unavailable */ }
}

/**
 * Clear persisted session ID.
 */
export function clearPersistedSession(): void {
  try {
    localStorage.removeItem(VOICE_SESSION_STORAGE_KEY)
  } catch { /* storage may be unavailable */ }
}

/**
 * Check if we're returning from a breakout capture (URL param or localStorage).
 * Returns session_id if found, null otherwise.
 * Cleans up URL params via replaceState.
 */
export function checkBreakoutReturn(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Check URL params (primary — redirect from breakout page)
  const params = new URLSearchParams(window.location.search)
  const urlSessionId = params.get('voice_session_id')

  if (urlSessionId) {
    // Clean URL
    const url = new URL(window.location.href)
    url.searchParams.delete('voice_session_id')
    window.history.replaceState({}, '', url.toString())
    persistSessionId(urlSessionId)
    return urlSessionId
  }

  // 2. Check localStorage (recovery — if redirect lost the param)
  try {
    const stored = localStorage.getItem(VOICE_SESSION_STORAGE_KEY)
    if (stored) return stored
  } catch { /* storage unavailable */ }

  return null
}
