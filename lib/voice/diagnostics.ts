// =====================================================
// Voice Diagnostics — Environment detection + debugging
// =====================================================

// ---- Detection helpers (used by capture strategy logic) ----

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function hasSpeechRecognitionAPI(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function hasGetUserMediaAPI(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function hasMediaRecorderAPI(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

/**
 * Check the Permissions Policy (formerly Feature Policy) for microphone.
 * Returns true if allowed, false if explicitly blocked, null if API unavailable.
 */
export function checkMicPermissionsPolicy(): boolean | null {
  try {
    const doc = document as any
    const policy = doc.permissionsPolicy || doc.featurePolicy
    if (policy?.allowsFeature) {
      return policy.allowsFeature('microphone')
    }
  } catch { /* policy API not available */ }
  return null
}

/**
 * Decide whether to skip getUserMedia entirely (go straight to fallback).
 *
 * Rationale: getUserMedia is async. If it fails, we've lost the synchronous
 * user-gesture context needed for `<input>.click()` (file capture fallback).
 * So we must decide BEFORE awaiting whether to skip it.
 *
 * We skip when:
 * 1. We're in an iframe AND Permissions Policy explicitly blocks mic
 * 2. We're in an iframe on mobile AND Permissions Policy API is unavailable
 *    (conservative — Whop mobile WebView case)
 */
export function shouldSkipGetUserMedia(): boolean {
  if (typeof window === 'undefined') return false

  const isIframe = window.self !== window.top
  if (!isIframe) return false

  const policyResult = checkMicPermissionsPolicy()

  // Explicitly blocked by policy
  if (policyResult === false) return true

  // Policy API not available + mobile iframe = almost certainly blocked
  // (Whop mobile WebView doesn't expose the policy API but does block mic)
  if (policyResult === null && isMobileDevice()) return true

  return false
}

// ---- Full diagnostics report (for debug overlay) ----

export interface VoiceDiagnosticsReport {
  environment: {
    userAgent: string
    isSecureContext: boolean
    origin: string
    isIframe: boolean
    isMobile: boolean
    permissionsPolicyAllowsMic: boolean | null
    hasMediaDevices: boolean
    hasGetUserMedia: boolean
    hasMediaRecorder: boolean
    hasSpeechRecognition: boolean
  }
  mimeTypeSupport: Record<string, boolean>
  permissionState: string | null
  selectedStrategy: string
  timestamp: string
}

const MIME_TYPES_TO_TEST = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/ogg',
]

export async function gatherDiagnostics(selectedStrategy: string): Promise<VoiceDiagnosticsReport> {
  const environment = {
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    origin: location.origin,
    isIframe: window.self !== window.top,
    isMobile: isMobileDevice(),
    permissionsPolicyAllowsMic: checkMicPermissionsPolicy(),
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: hasGetUserMediaAPI(),
    hasMediaRecorder: hasMediaRecorderAPI(),
    hasSpeechRecognition: hasSpeechRecognitionAPI(),
  }

  // MIME type support
  const mimeTypeSupport: Record<string, boolean> = {}
  for (const mt of MIME_TYPES_TO_TEST) {
    try {
      mimeTypeSupport[mt] = hasMediaRecorderAPI() ? MediaRecorder.isTypeSupported(mt) : false
    } catch {
      mimeTypeSupport[mt] = false
    }
  }

  // Permission state (best effort — may fail on iOS)
  let permissionState: string | null = null
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    permissionState = result.state
  } catch (err) {
    permissionState = `error: ${err instanceof Error ? err.message : 'unknown'}`
  }

  return {
    environment,
    mimeTypeSupport,
    permissionState,
    selectedStrategy,
    timestamp: new Date().toISOString(),
  }
}
