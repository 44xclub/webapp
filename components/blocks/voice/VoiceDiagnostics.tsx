'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Bug } from 'lucide-react'
import { gatherDiagnostics, type VoiceDiagnosticsReport } from '@/lib/voice/diagnostics'
import type { VoiceState } from '@/lib/hooks/useVoiceScheduling'

interface VoiceDiagnosticsProps {
  selectedStrategy: string
  voiceState: VoiceState
  lastError: string | null
}

/**
 * Debug overlay for voice capture diagnostics.
 * Enabled by ?voice_debug=1 query param.
 */
export function VoiceDiagnostics({ selectedStrategy, voiceState, lastError }: VoiceDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [report, setReport] = useState<VoiceDiagnosticsReport | null>(null)
  const [copied, setCopied] = useState(false)
  const [enabled, setEnabled] = useState(false)

  // Check for ?voice_debug=1 on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setEnabled(params.get('voice_debug') === '1')
  }, [])

  const runDiagnostics = useCallback(async () => {
    setIsOpen(true)
    const data = await gatherDiagnostics(selectedStrategy)
    setReport(data)
  }, [selectedStrategy])

  const copyDiagnostics = useCallback(async () => {
    if (!report) return
    const output = {
      ...report,
      runtime: { voiceState, lastError },
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(output, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = JSON.stringify(output, null, 2)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [report, voiceState, lastError])

  if (!enabled) return null

  return (
    <>
      {/* Debug FAB */}
      <button
        onClick={runDiagnostics}
        className="fixed top-4 right-4 z-[60] h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center"
        title="Voice Diagnostics"
      >
        <Bug className="h-4 w-4 text-amber-400" />
      </button>

      {/* Overlay */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsOpen(false)} />

          <div className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto bg-[#0d1014] rounded-[16px] border border-[rgba(255,255,255,0.10)]">
            {/* Header */}
            <div className="sticky top-0 bg-[#0d1014] px-4 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="text-[14px] font-bold text-amber-400">Voice Diagnostics</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyDiagnostics}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1">
                  <X className="h-4 w-4 text-[rgba(238,242,255,0.5)]" />
                </button>
              </div>
            </div>

            {report ? (
              <div className="p-4 space-y-4 text-[12px] font-mono">
                {/* Runtime */}
                <Section title="Runtime">
                  <Row label="voiceState" value={voiceState} />
                  <Row label="selectedStrategy" value={selectedStrategy} />
                  {lastError && <Row label="lastError" value={lastError} highlight="red" />}
                </Section>

                {/* Environment */}
                <Section title="Environment">
                  <Row label="isSecureContext" value={String(report.environment.isSecureContext)} highlight={report.environment.isSecureContext ? 'green' : 'red'} />
                  <Row label="isIframe" value={String(report.environment.isIframe)} highlight={report.environment.isIframe ? 'amber' : 'green'} />
                  <Row label="isMobile" value={String(report.environment.isMobile)} />
                  <Row label="origin" value={report.environment.origin} />
                </Section>

                {/* APIs */}
                <Section title="Audio APIs">
                  <Row label="SpeechRecognition" value={String(report.environment.hasSpeechRecognition)} highlight={report.environment.hasSpeechRecognition ? 'green' : 'red'} />
                  <Row label="navigator.mediaDevices" value={String(report.environment.hasMediaDevices)} highlight={report.environment.hasMediaDevices ? 'green' : 'red'} />
                  <Row label="getUserMedia" value={String(report.environment.hasGetUserMedia)} highlight={report.environment.hasGetUserMedia ? 'green' : 'red'} />
                  <Row label="MediaRecorder" value={String(report.environment.hasMediaRecorder)} highlight={report.environment.hasMediaRecorder ? 'green' : 'red'} />
                  <Row label="permissionsPolicy.mic" value={String(report.environment.permissionsPolicyAllowsMic)} highlight={report.environment.permissionsPolicyAllowsMic === false ? 'red' : report.environment.permissionsPolicyAllowsMic === true ? 'green' : 'amber'} />
                  <Row label="permission.state" value={report.permissionState || 'N/A'} />
                </Section>

                {/* MIME types */}
                <Section title="MediaRecorder MIME Types">
                  {Object.entries(report.mimeTypeSupport).map(([mime, supported]) => (
                    <Row key={mime} label={mime} value={String(supported)} highlight={supported ? 'green' : 'red'} />
                  ))}
                </Section>

                {/* User Agent */}
                <Section title="User Agent">
                  <p className="text-[11px] text-[rgba(238,242,255,0.5)] break-all">{report.environment.userAgent}</p>
                </Section>
              </div>
            ) : (
              <div className="p-8 text-center text-[rgba(238,242,255,0.4)] text-[13px]">
                Gathering diagnostics...
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-[rgba(238,242,255,0.35)] uppercase tracking-wider mb-1.5">{title}</h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

const highlightColors = {
  green: 'text-green-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' | 'amber' }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[rgba(238,242,255,0.55)] shrink-0">{label}</span>
      <span className={`text-right break-all ${highlight ? highlightColors[highlight] : 'text-[rgba(238,242,255,0.8)]'}`}>{value}</span>
    </div>
  )
}
