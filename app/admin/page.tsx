'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  ShieldCheck,
  Dumbbell,
  Target,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'
import { isAdmin } from '@/lib/utils/admin'
import { useAdminReview, type ReviewItem } from '@/lib/hooks/useAdminReview'
import { useToast } from '@/components/shared/Toast'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { PersonalProgramme, PersonalFrameworkTemplate, ProgrammeFocus } from '@/lib/types'

const focusLabels: Record<ProgrammeFocus, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  conditioning: 'Conditioning',
  hybrid: 'Hybrid',
}

const focusColors: Record<ProgrammeFocus, string> = {
  strength: 'text-red-400 bg-red-500/10',
  hypertrophy: 'text-purple-400 bg-purple-500/10',
  conditioning: 'text-cyan-400 bg-cyan-500/10',
  hybrid: 'text-amber-400 bg-amber-500/10',
}

export default function AdminPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { showToast } = useToast()

  // Auth check
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error || !user) {
          router.push('/login')
          return
        }

        // Check admin status
        if (!isAdmin(user.id)) {
          router.push('/app')
          return
        }

        setUser(user)
        setAuthorized(true)
        setAuthLoading(false)
      } catch {
        if (isMounted) { setAuthLoading(false); router.push('/login') }
      }
    }
    checkAuth()

    return () => { isMounted = false }
  }, [router, supabase])

  const { items, loading, error, approveItem, rejectItem } = useAdminReview()

  const handleApprove = async (item: ReviewItem) => {
    const success = await approveItem(item.review.id, item.review.entity_type, item.review.entity_id)
    if (success) {
      showToast('success', `${item.review.entity_type === 'programme' ? 'Programme' : 'Framework'} approved.`)
    } else {
      showToast('error', 'Failed to approve. Please try again.')
    }
  }

  const handleReject = async (item: ReviewItem) => {
    const success = await rejectItem(item.review.id, item.review.entity_type, item.review.entity_id)
    if (success) {
      showToast('status', `${item.review.entity_type === 'programme' ? 'Programme' : 'Framework'} rejected.`)
    } else {
      showToast('error', 'Failed to reject. Please try again.')
    }
  }

  if (authLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090d] pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#07090d]/95 backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#eef2ff]">Admin Review</h1>
            <p className="text-[12px] text-[rgba(238,242,255,0.45)]">
              Approve or reject submitted programmes and frameworks
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.45)]" />
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 rounded-[14px] p-4 text-center">
            <p className="text-rose-400 text-[14px]">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] p-8 border border-[rgba(255,255,255,0.06)] text-center">
            <ShieldCheck className="h-12 w-12 text-[rgba(238,242,255,0.25)] mx-auto mb-4" />
            <h3 className="text-[16px] font-medium text-[#eef2ff] mb-2">No Pending Reviews</h3>
            <p className="text-[13px] text-[rgba(238,242,255,0.45)]">
              All submissions have been reviewed. Check back later.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <ReviewCard
              key={item.review.id}
              item={item}
              onApprove={() => handleApprove(item)}
              onReject={() => handleReject(item)}
            />
          ))
        )}
      </main>
    </div>
  )
}

function ReviewCard({
  item,
  onApprove,
  onReject,
}: {
  item: ReviewItem
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)

  const isProgramme = item.review.entity_type === 'programme'
  const programme = isProgramme ? item.entity as PersonalProgramme : null
  const framework = !isProgramme ? item.entity as PersonalFrameworkTemplate : null

  const handleApprove = async () => {
    setProcessing(true)
    await onApprove()
    setProcessing(false)
  }

  const handleReject = async () => {
    setProcessing(true)
    await onReject()
    setProcessing(false)
  }

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
            isProgramme ? 'bg-purple-500/20' : 'bg-blue-500/20'
          }`}>
            {isProgramme ? (
              <Dumbbell className="h-5 w-5 text-purple-400" />
            ) : (
              <Target className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div className="text-left">
            <p className="text-[14px] font-medium text-[#eef2ff]">
              {programme?.title || framework?.title || 'Unknown'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[rgba(238,242,255,0.45)]">
                {isProgramme ? 'Programme' : 'Framework'}
              </span>
              {programme && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-[4px] ${focusColors[programme.focus]}`}>
                  {focusLabels[programme.focus]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
          )}
        </div>
      </button>

      {/* User Info */}
      <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-[rgba(238,242,255,0.45)]" />
        <span className="text-[12px] text-[rgba(238,242,255,0.52)]">
          Submitted by: {item.user?.display_name || 'Unknown User'}
        </span>
        <span className="text-[11px] text-[rgba(238,242,255,0.35)]">
          {new Date(item.review.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)]">
          {/* Programme Details */}
          {programme && (
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-4 text-[12px] text-[rgba(238,242,255,0.52)]">
                <span>{programme.days_per_week} days/week</span>
                <span>{programme.days?.length || 0} days configured</span>
              </div>

              {/* Days */}
              {programme.days?.map((day) => (
                <div key={day.id} className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3">
                  <p className="text-[13px] font-medium text-[#eef2ff] mb-2">
                    Day {day.day_index}: {day.title}
                  </p>
                  {day.exercises && day.exercises.length > 0 ? (
                    <ul className="space-y-1">
                      {day.exercises.map((ex) => (
                        <li key={ex.id} className="text-[12px] text-[rgba(238,242,255,0.72)] flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[rgba(238,242,255,0.35)]" />
                          <span>{ex.exercise_name}</span>
                          {(ex.sets || ex.reps) && (
                            <span className="text-[rgba(238,242,255,0.45)]">
                              {ex.sets && `${ex.sets} sets`}
                              {ex.sets && ex.reps && ' × '}
                              {ex.reps}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-[rgba(238,242,255,0.35)] italic">No exercises</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Framework Details */}
          {framework && (
            <div className="px-4 py-3 space-y-2">
              {framework.description && (
                <p className="text-[13px] text-[rgba(238,242,255,0.72)]">{framework.description}</p>
              )}
              {framework.criteria && (framework.criteria as { items?: { key: string; label: string }[] }).items && (
                <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3">
                  <p className="text-[12px] text-[rgba(238,242,255,0.45)] mb-2">Non-negotiables:</p>
                  <ul className="space-y-1">
                    {((framework.criteria as { items?: { key: string; label: string }[] }).items || []).map((item: { key: string; label: string }) => (
                      <li key={item.key} className="text-[13px] text-[rgba(238,242,255,0.72)] flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[rgba(238,242,255,0.35)]" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-end gap-2">
        <button
          onClick={handleReject}
          disabled={processing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-rose-500/10 text-rose-400 text-[13px] font-medium hover:bg-rose-500/20 transition-colors disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={processing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-emerald-500/20 text-emerald-400 text-[13px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve
        </button>
      </div>
    </div>
  )
}
