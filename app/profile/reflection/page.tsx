'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft, Check, FileText, Send } from 'lucide-react'
import { useReflection } from '@/lib/hooks'
import { BottomNav } from '@/components/shared/BottomNav'
import { Modal, Button, Textarea } from '@/components/ui'
import type { ReflectionCycleWithEntry, ReflectionAnswers, ReflectionStatus } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const QUESTIONS = [
  { key: 'q1', label: 'What went well this cycle?', multiline: true },
  { key: 'q2', label: 'What didn\'t go as planned?', multiline: true },
  { key: 'q3', label: 'What did I learn about myself?', multiline: true },
  { key: 'q4', label: 'What will I do differently next cycle?', multiline: true },
  { key: 'q5', label: 'What am I grateful for?', multiline: true },
  { key: 'q6', label: 'What are my priorities for the next two weeks?', multiline: true },
  { key: 'q7', label: 'What support or resources do I need?', multiline: true },
  { key: 'q8', label: 'One word to describe how I feel right now', multiline: false },
] as const

const statusConfig: Record<ReflectionStatus, { label: string; className: string; bgClassName: string }> = {
  not_started: {
    label: 'Not started',
    className: 'text-[rgba(238,242,255,0.45)]',
    bgClassName: 'bg-[rgba(255,255,255,0.04)]',
  },
  draft: {
    label: 'Draft',
    className: 'text-amber-400',
    bgClassName: 'bg-amber-400/10',
  },
  submitted: {
    label: 'Submitted',
    className: 'text-emerald-400',
    bgClassName: 'bg-emerald-400/10',
  },
}

function ReflectionModal({
  isOpen,
  onClose,
  cycle,
  onSave,
  saving,
}: {
  isOpen: boolean
  onClose: () => void
  cycle: ReflectionCycleWithEntry | null
  onSave: (cycleId: string, answers: ReflectionAnswers, submit?: boolean) => Promise<unknown>
  saving: boolean
}) {
  const [localAnswers, setLocalAnswers] = useState<ReflectionAnswers>({})
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Sync answers when cycle changes
  useEffect(() => {
    if (cycle) {
      setLocalAnswers(cycle.entry?.answers || {})
      setLastSaved(cycle.entry?.updated_at ? new Date(cycle.entry.updated_at) : null)
    }
  }, [cycle])

  if (!cycle) return null

  const isSubmitted = cycle.displayStatus === 'submitted'
  const status = statusConfig[cycle.displayStatus]

  const handleSave = async (submit: boolean = false) => {
    const result = await onSave(cycle.id, localAnswers, submit)
    if (result) {
      setLastSaved(new Date())
      if (submit) onClose()
    }
  }

  const handleInputChange = (key: keyof ReflectionAnswers, value: string) => {
    if (isSubmitted) return
    setLocalAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cycle.label.replace('Reflection — ', '')}
      showClose
    >
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Date range and status */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[rgba(238,242,255,0.45)]">
            {new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            {' — '}
            {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.className} ${status.bgClassName}`}>
            {status.label}
          </span>
        </div>

        {/* Questions */}
        {QUESTIONS.map((q, index) => (
          <div key={q.key}>
            <label className="block text-[12px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5">
              {index + 1}. {q.label}
            </label>
            {q.multiline ? (
              <Textarea
                value={localAnswers[q.key] || ''}
                onChange={(e) => handleInputChange(q.key, e.target.value)}
                placeholder={isSubmitted ? '' : 'Write your thoughts...'}
                rows={3}
                disabled={isSubmitted}
                className="resize-none text-[13px]"
              />
            ) : (
              <input
                type="text"
                value={localAnswers[q.key] || ''}
                onChange={(e) => handleInputChange(q.key, e.target.value)}
                placeholder={isSubmitted ? '' : 'Enter one word...'}
                disabled={isSubmitted}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.30)] focus:border-[#3b82f6] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            )}
          </div>
        ))}

        {/* Actions */}
        {!isSubmitted ? (
          <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-[#0d1014] py-3 -mx-4 px-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          cycle.entry?.submitted_at && (
            <p className="text-[11px] text-emerald-400 pt-2 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Submitted on {new Date(cycle.entry.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )
        )}
      </div>
    </Modal>
  )
}

export default function ReflectionPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedCycle, setSelectedCycle] = useState<ReflectionCycleWithEntry | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error || !user) { router.push('/login'); return }
        setUser(user)
        setAuthLoading(false)
      } catch { if (isMounted) router.push('/login') }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') router.push('/login')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  const { cycles, loading, saving, saveEntry, refetch } = useReflection(user?.id)

  // Get current cycle
  const currentCycle = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return cycles.find((c) => c.start_date <= today && c.end_date >= today) || null
  }, [cycles])

  // Separate past and future cycles
  const { pastCycles, futureCycles } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const past: ReflectionCycleWithEntry[] = []
    const future: ReflectionCycleWithEntry[] = []

    cycles.forEach((c) => {
      if (c === currentCycle) return
      if (c.end_date < today) {
        past.push(c)
      } else if (c.start_date > today) {
        future.push(c)
      }
    })

    return { pastCycles: past, futureCycles: future }
  }, [cycles, currentCycle])

  const handleSave = useCallback(async (cycleId: string, answers: ReflectionAnswers, submit?: boolean) => {
    const result = await saveEntry(cycleId, answers, submit)
    if (result) {
      refetch()
    }
    return result
  }, [saveEntry, refetch])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-2 -ml-2 text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[20px] font-semibold text-[#eef2ff] ml-1">Reflection & Planning</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
          </div>
        ) : (
          <>
            {/* Current Cycle - Highlighted */}
            {currentCycle && (
              <div>
                <h2 className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide mb-2">
                  Current Cycle
                </h2>
                <button
                  onClick={() => setSelectedCycle(currentCycle)}
                  className="w-full bg-[rgba(59,130,246,0.08)] rounded-[14px] border border-[rgba(59,130,246,0.2)] p-4 text-left hover:bg-[rgba(59,130,246,0.12)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[15px] font-semibold text-[#eef2ff]">
                      {currentCycle.label.replace('Reflection — ', '')}
                    </p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusConfig[currentCycle.displayStatus].className} ${statusConfig[currentCycle.displayStatus].bgClassName}`}>
                      {statusConfig[currentCycle.displayStatus].label}
                    </span>
                  </div>
                  <p className="text-[12px] text-[rgba(238,242,255,0.50)]">
                    {new Date(currentCycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(currentCycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {currentCycle.displayStatus === 'not_started' && (
                    <p className="text-[12px] text-[#3b82f6] mt-2">Tap to start your reflection</p>
                  )}
                </button>
              </div>
            )}

            {/* Past Cycles */}
            {pastCycles.length > 0 && (
              <div>
                <h2 className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide mb-2">
                  Past Cycles
                </h2>
                <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] divide-y divide-[rgba(255,255,255,0.06)]">
                  {pastCycles.slice(0, 10).map((cycle) => (
                    <button
                      key={cycle.id}
                      onClick={() => setSelectedCycle(cycle)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">
                          {cycle.label.replace('Reflection — ', '')}
                        </p>
                        <p className="text-[11px] text-[rgba(238,242,255,0.40)] mt-0.5">
                          {new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' — '}
                          {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusConfig[cycle.displayStatus].className} ${statusConfig[cycle.displayStatus].bgClassName}`}>
                        {statusConfig[cycle.displayStatus].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Future Cycles */}
            {futureCycles.length > 0 && (
              <div>
                <h2 className="text-[12px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide mb-2">
                  Upcoming Cycles
                </h2>
                <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] divide-y divide-[rgba(255,255,255,0.06)]">
                  {futureCycles.slice(0, 3).map((cycle) => (
                    <div
                      key={cycle.id}
                      className="px-4 py-3 flex items-center justify-between opacity-60"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">
                          {cycle.label.replace('Reflection — ', '')}
                        </p>
                        <p className="text-[11px] text-[rgba(238,242,255,0.40)] mt-0.5">
                          {new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' — '}
                          {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[11px] text-[rgba(238,242,255,0.40)]">
                        Upcoming
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />

      {/* Reflection Modal */}
      <ReflectionModal
        isOpen={!!selectedCycle}
        onClose={() => setSelectedCycle(null)}
        cycle={selectedCycle}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
