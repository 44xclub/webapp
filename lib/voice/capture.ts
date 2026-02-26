// =====================================================
// Voice Capture — Strategy-based module
// =====================================================
//
// Attempts multiple capture strategies in order:
//   1. getUserMedia + MediaRecorder (standard web audio)
//   2. <input type="file" accept="audio/*" capture> (OS-level recording)
//
// Falls back automatically when a strategy fails (e.g. mic blocked by
// iframe Permissions Policy inside Whop mobile).

/** Detailed error info for diagnostics */
export interface VoiceCaptureError {
  strategy: 'media_recorder' | 'file_input'
  errorName: string
  errorMessage: string
  /** One of our semantic codes for UI messaging */
  code:
    | 'permission_denied'
    | 'blocked_by_policy'
    | 'not_supported'
    | 'insecure_context'
    | 'no_audio_data'
    | 'unknown'
}

export interface CaptureResult {
  /** The audio blob ready for upload */
  blob: Blob
  /** Which strategy produced this blob */
  strategy: 'media_recorder' | 'file_input'
  /** MIME type of the blob */
  mimeType: string
}

// ------------------------------------------------------------------
// Environment detection helpers (used by diagnostics overlay too)
// ------------------------------------------------------------------

export function detectEnvironment() {
  const ua = navigator.userAgent
  const isSecure = window.isSecureContext
  const isIframe = window.self !== window.top
  const origin = location.origin

  // Permissions Policy checks
  let permissionsPolicyMic: boolean | null = null
  try {
    // Modern API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pp = (document as any).permissionsPolicy
    if (pp?.allowsFeature) {
      permissionsPolicyMic = pp.allowsFeature('microphone')
    }
  } catch { /* not available */ }

  if (permissionsPolicyMic === null) {
    try {
      // Legacy API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fp = (document as any).featurePolicy
      if (fp?.allowsFeature) {
        permissionsPolicyMic = fp.allowsFeature('microphone')
      }
    } catch { /* not available */ }
  }

  const hasMediaDevices = typeof navigator.mediaDevices !== 'undefined'
  const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined'

  // MIME type support
  const mimeSupport: Record<string, boolean> = {}
  if (hasMediaRecorder) {
    for (const mime of [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/wav',
    ]) {
      mimeSupport[mime] = MediaRecorder.isTypeSupported(mime)
    }
  }

  return {
    userAgent: ua,
    isSecureContext: isSecure,
    isIframe,
    origin,
    permissionsPolicyAllowsMic: permissionsPolicyMic,
    hasMediaDevices,
    hasGetUserMedia,
    hasMediaRecorder,
    mimeSupport,
  }
}

export async function queryMicPermission(): Promise<string> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state // 'granted' | 'denied' | 'prompt'
  } catch (err) {
    return `query_failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ------------------------------------------------------------------
// Strategy 1: getUserMedia + MediaRecorder
// ------------------------------------------------------------------

function selectMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return '' // let browser pick default
}

function mapGetUserMediaError(err: unknown): VoiceCaptureError {
  const e = err instanceof Error ? err : new Error(String(err))
  let code: VoiceCaptureError['code'] = 'unknown'

  if (e.name === 'NotAllowedError') {
    // Could be user denied OR iframe policy blocked
    code = e.message?.toLowerCase().includes('policy')
      ? 'blocked_by_policy'
      : 'permission_denied'
  } else if (e.name === 'NotFoundError' || e.name === 'NotSupportedError') {
    code = 'not_supported'
  } else if (e.name === 'SecurityError') {
    code = 'insecure_context'
  } else if (e.message === 'not-supported') {
    code = 'not_supported'
  }

  return {
    strategy: 'media_recorder',
    errorName: e.name,
    errorMessage: e.message,
    code,
  }
}

export interface MediaRecorderHandle {
  /** Stop recording and return the audio blob */
  stop: () => Promise<CaptureResult>
  /** Abort recording without producing a result */
  abort: () => void
}

/**
 * Strategy 1: Start recording with getUserMedia + MediaRecorder.
 *
 * IMPORTANT: Call this directly inside a user gesture handler (click/tap)
 * — do NOT await anything before calling this. Some WebViews reject
 * getUserMedia if it's not in the synchronous gesture call stack.
 */
export async function startMediaRecorder(): Promise<MediaRecorderHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw mapGetUserMediaError(new Error('not-supported'))
  }

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    })
  } catch (err) {
    throw mapGetUserMediaError(err)
  }

  const mimeType = selectMimeType()
  const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, options)
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    const e = err instanceof Error ? err : new Error(String(err))
    throw {
      strategy: 'media_recorder',
      errorName: e.name,
      errorMessage: e.message,
      code: 'not_supported',
    } as VoiceCaptureError
  }

  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.start()

  return {
    stop: () =>
      new Promise<CaptureResult>((resolve, reject) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          const actualType = mimeType || recorder.mimeType || 'audio/webm'
          const blob = new Blob(chunks, { type: actualType })
          if (blob.size === 0) {
            reject({
              strategy: 'media_recorder',
              errorName: 'EmptyRecording',
              errorMessage: 'No audio data captured',
              code: 'no_audio_data',
            } as VoiceCaptureError)
            return
          }
          resolve({ blob, strategy: 'media_recorder', mimeType: actualType })
        }
        recorder.onerror = () => {
          stream.getTracks().forEach((t) => t.stop())
          reject({
            strategy: 'media_recorder',
            errorName: 'RecorderError',
            errorMessage: 'MediaRecorder error during recording',
            code: 'unknown',
          } as VoiceCaptureError)
        }
        try {
          if (recorder.state !== 'inactive') recorder.stop()
        } catch {
          stream.getTracks().forEach((t) => t.stop())
          reject({
            strategy: 'media_recorder',
            errorName: 'StopError',
            errorMessage: 'Failed to stop MediaRecorder',
            code: 'unknown',
          } as VoiceCaptureError)
        }
      }),
    abort: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch { /* ignore */ }
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

// ------------------------------------------------------------------
// Strategy 2: <input type="file" accept="audio/*" capture>
// ------------------------------------------------------------------

/**
 * Strategy 2: Use the OS audio capture via file input.
 *
 * This works even when getUserMedia is blocked by iframe Permissions Policy
 * because it delegates to the OS recording UI rather than requesting
 * in-page microphone access.
 *
 * Returns a Promise that resolves with the recorded audio file, or rejects
 * if the user cancels.
 */
export function triggerFileCapture(): Promise<CaptureResult> {
  return new Promise<CaptureResult>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    // "capture" invokes the OS recording UI on mobile.
    // Some iOS versions need just `capture` (empty), Android uses "microphone".
    input.setAttribute('capture', '')
    input.style.display = 'none'

    let settled = false

    const cleanup = () => {
      input.remove()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleWindowFocus)
    }

    const cancelCapture = () => {
      if (!settled) {
        settled = true
        cleanup()
        reject({
          strategy: 'file_input',
          errorName: 'UserCancelled',
          errorMessage: 'User cancelled file capture',
          code: 'no_audio_data',
        } as VoiceCaptureError)
      }
    }

    // Detect user cancelling: when the page regains visibility / focus after
    // the OS picker closes without selecting a file. We use both
    // visibilitychange (reliable on iOS) and window focus (reliable on Android).
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Delay to let the change event fire first (it fires before or
        // simultaneously with visibilitychange on some devices)
        setTimeout(cancelCapture, 1000)
      }
    }

    const handleWindowFocus = () => {
      setTimeout(cancelCapture, 1000)
    }

    input.onchange = () => {
      settled = true
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        reject({
          strategy: 'file_input',
          errorName: 'NoFile',
          errorMessage: 'No audio file selected',
          code: 'no_audio_data',
        } as VoiceCaptureError)
        return
      }
      resolve({
        blob: file,
        strategy: 'file_input',
        mimeType: file.type || 'audio/mp4',
      })
    }

    document.body.appendChild(input)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleWindowFocus)
    input.click()
  })
}

// ------------------------------------------------------------------
// Human-readable error messages for the UI
// ------------------------------------------------------------------

export function captureErrorMessage(error: VoiceCaptureError): string {
  switch (error.code) {
    case 'permission_denied':
      return 'Microphone permission was denied. Please allow microphone access in your browser settings.'
    case 'blocked_by_policy':
      return 'Microphone blocked in this embedded view. Switching to alternate recording mode.'
    case 'not_supported':
      return 'Audio recording is not supported in this browser.'
    case 'insecure_context':
      return 'Microphone requires a secure (HTTPS) connection.'
    case 'no_audio_data':
      return 'No audio was captured. Please try again.'
    default:
      return `Recording failed: ${error.errorMessage}`
  }
}

/** Check if we should auto-fallback to file capture based on this error */
export function shouldFallbackToFileCapture(error: VoiceCaptureError): boolean {
  return (
    error.code === 'blocked_by_policy' ||
    error.code === 'not_supported' ||
    error.code === 'insecure_context' ||
    // On mobile inside Whop, NotAllowedError with no prior prompt = policy block
    error.code === 'permission_denied'
  )
}

// ------------------------------------------------------------------
// Pre-detection: should we skip getUserMedia and go straight to file?
// ------------------------------------------------------------------

/**
 * Detect whether getUserMedia will almost certainly fail in this environment.
 *
 * This runs on mount (not on tap) so we can choose the right strategy
 * **synchronously** in the gesture handler, preserving the user gesture
 * context required for input.click() on mobile.
 *
 * Returns true if we should skip getUserMedia and use file capture directly.
 */
export function shouldUseFileCaptureOnly(): boolean {
  // Not in a browser
  if (typeof window === 'undefined') return false

  const isIframe = window.self !== window.top

  // If not in an iframe, getUserMedia should work normally
  if (!isIframe) return false

  // Check Permissions Policy — if mic is explicitly blocked, skip getUserMedia
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pp = (document as any).permissionsPolicy
    if (pp?.allowsFeature) {
      if (!pp.allowsFeature('microphone')) return true
    }
  } catch { /* not available */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fp = (document as any).featurePolicy
    if (fp?.allowsFeature) {
      if (!fp.allowsFeature('microphone')) return true
    }
  } catch { /* not available */ }

  // No getUserMedia API at all
  if (!navigator.mediaDevices?.getUserMedia) return true

  // Heuristic: mobile webview inside iframe
  // On mobile + iframe, if we can't confirm mic is allowed, err on the side
  // of file capture (it will always work) rather than losing the gesture
  // context on a getUserMedia rejection.
  const ua = navigator.userAgent
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
  const isWebView =
    // iOS WKWebView identifiers
    (/(iPhone|iPad|iPod)/.test(ua) && !/Safari/i.test(ua)) ||
    // Android WebView identifier
    /wv\)/.test(ua) ||
    // Generic in-app browser markers
    /FBAN|FBAV|Instagram|WhopApp/i.test(ua)

  // In a mobile webview iframe, mic access is almost never available
  if (isMobile && isWebView) return true

  // On mobile in an iframe without a clear policy signal, we still can't
  // risk losing gesture context. Only Permissions Policy can tell us for
  // sure, and if the API isn't available we have no way to know.
  // Conservative: if mobile + iframe + no Permissions Policy API → file capture
  if (isMobile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasPolicyAPI = !!(document as any).permissionsPolicy || !!(document as any).featurePolicy
    if (!hasPolicyAPI) return true
  }

  return false
}
