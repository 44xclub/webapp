'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { X, Copy, Check, Bug } from 'lucide-react'
import { detectEnvironment, queryMicPermission } from '@/lib/voice/capture'

interface DiagnosticsData {
  timestamp: string
  environment: ReturnType<typeof detectEnvironment>
  micPermission: string
  runtimeErrors: RuntimeError[]
}

interface RuntimeError {
  phase: string
  errorName: string
  errorMessage: string
  errorStack?: string
  timestamp: string
}

/** Singleton store for runtime errors — push from anywhere */
const runtimeErrors: RuntimeError[] = []

export function logVoiceDiagnosticError(
  phase: string,
  err: unknown
) {
  const e = err instanceof Error ? err : new Error(String(err))
  runtimeErrors.push({
    phase,
    errorName: e.name,
    errorMessage: e.message,
    errorStack: e.stack?.slice(0, 500),
    timestamp: new Date().toISOString(),
  })
  // Keep at most 20 entries
  if (runtimeErrors.length > 20) runtimeErrors.shift()
}

/** Check if voice debug is enabled via query param or env */
export function isVoiceDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('voice_debug') === '1') return true
  // Also check for env flag baked into the build
  if (process.env.NEXT_PUBLIC_VOICE_DEBUG === '1') return true
  return false
}

export function VoiceDebugOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(isVoiceDebugEnabled())
  }, [])

  const collectDiagnostics = useCallback(async () => {
    const env = detectEnvironment()
    const micPerm = await queryMicPermission()

    setDiagnostics({
      timestamp: new Date().toISOString(),
      environment: env,
      micPermission: micPerm,
      runtimeErrors: [...runtimeErrors],
    })
  }, [])

  const handleOpen = useCallback(async () => {
    setIsOpen(true)
    await collectDiagnostics()
  }, [collectDiagnostics])

  const handleCopy = useCallback(async () => {
    if (!diagnostics) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments where clipboard API fails
      const textArea = document.createElement('textarea')
      textArea.value = JSON.stringify(diagnostics, null, 2)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [diagnostics])

  if (!enabled) return null

  // Floating debug button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 left-3 z-50 h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center"
        title="Voice diagnostics"
      >
        <Bug className="h-4 w-4 text-amber-400" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
      <div className="relative z-10 w-full max-w-md max-h-[80vh] overflow-y-auto bg-[#0d1014] border border-[rgba(255,255,255,0.10)] rounded-[12px]">
        {/* Header */}
        <div className="sticky top-0 bg-[#0d1014] border-b border-[rgba(255,255,255,0.06)] px-4 py-3 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-amber-400">Voice Debug</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 text-[rgba(238,242,255,0.40)]" />
            </button>
          </div>
        </div>

        {diagnostics && (
          <div className="p-4 space-y-4 text-[12px] font-mono">
            {/* Environment */}
            <Section title="Environment">
              <Row label="userAgent" value={diagnostics.environment.userAgent} truncate />
              <Row label="isSecureContext" value={String(diagnostics.environment.isSecureContext)} />
              <Row label="origin" value={diagnostics.environment.origin} />
              <Row label="isIframe" value={String(diagnostics.environment.isIframe)} />
              <Row
                label="permissionsPolicyAllowsMic"
                value={diagnostics.environment.permissionsPolicyAllowsMic === null ? 'N/A (API unavailable)' : String(diagnostics.environment.permissionsPolicyAllowsMic)}
                warn={diagnostics.environment.permissionsPolicyAllowsMic === false}
              />
              <Row label="hasMediaDevices" value={String(diagnostics.environment.hasMediaDevices)} warn={!diagnostics.environment.hasMediaDevices} />
              <Row label="hasGetUserMedia" value={String(diagnostics.environment.hasGetUserMedia)} warn={!diagnostics.environment.hasGetUserMedia} />
              <Row label="hasMediaRecorder" value={String(diagnostics.environment.hasMediaRecorder)} warn={!diagnostics.environment.hasMediaRecorder} />
            </Section>

            {/* MIME support */}
            <Section title="MediaRecorder MIME Support">
              {Object.entries(diagnostics.environment.mimeSupport).map(([mime, supported]) => (
                <Row key={mime} label={mime} value={String(supported)} warn={!supported} />
              ))}
              {Object.keys(diagnostics.environment.mimeSupport).length === 0 && (
                <p className="text-[rgba(255,80,80,0.85)]">MediaRecorder not available</p>
              )}
            </Section>

            {/* Mic Permission */}
            <Section title="Microphone Permission">
              <Row label="state" value={diagnostics.micPermission} warn={diagnostics.micPermission !== 'granted'} />
            </Section>

            {/* Runtime Errors */}
            <Section title={`Runtime Errors (${diagnostics.runtimeErrors.length})`}>
              {diagnostics.runtimeErrors.length === 0 ? (
                <p className="text-[rgba(238,242,255,0.40)]">No errors captured</p>
              ) : (
                diagnostics.runtimeErrors.map((err, i) => (
                  <div key={i} className="mb-2 p-2 bg-[rgba(255,80,80,0.06)] rounded border border-[rgba(255,80,80,0.10)]">
                    <div className="text-[rgba(255,80,80,0.85)]">{err.phase}</div>
                    <div className="text-[rgba(238,242,255,0.60)]">{err.errorName}: {err.errorMessage}</div>
                    <div className="text-[10px] text-[rgba(238,242,255,0.30)]">{err.timestamp}</div>
                  </div>
                ))
              )}
            </Section>

            <div className="text-[10px] text-[rgba(238,242,255,0.25)]">
              Collected at {diagnostics.timestamp}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Helpers ----

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(238,242,255,0.50)] mb-1.5">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Row({ label, value, truncate, warn }: { label: string; value: string; truncate?: boolean; warn?: boolean }) {
  return (
    <div className="flex gap-2 justify-between">
      <span className="text-[rgba(238,242,255,0.45)] shrink-0">{label}</span>
      <span
        className={`text-right ${warn ? 'text-[rgba(255,80,80,0.85)]' : 'text-[rgba(238,242,255,0.75)]'} ${truncate ? 'truncate max-w-[200px]' : ''}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}
