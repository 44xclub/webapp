'use client'

import { CheckSquare, ChevronRight, Lock } from 'lucide-react'
import type { UserFramework, DailyFrameworkSubmission } from '@/lib/types'

interface ActiveFrameworkCardProps {
  activeFramework: UserFramework | null
  todaySubmission: DailyFrameworkSubmission | null
  completionCount: { completed: number; total: number }
  onOpenChecklist: () => void
  compact?: boolean
}

export function ActiveFrameworkCard({
  activeFramework,
  todaySubmission,
  completionCount,
  onOpenChecklist,
  compact = false,
}: ActiveFrameworkCardProps) {
  if (!activeFramework?.framework_template) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[var(--radius-section)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[rgba(238,242,255,0.55)]">No framework activated</p>
          <a href="#available-frameworks" className="text-[12px] text-[var(--accent-primary)] font-medium hover:underline">
            Choose one
          </a>
        </div>
      </div>
    )
  }

  const { completed, total } = completionCount
  const progressPercent = total > 0 ? (completed / total) * 100 : 0
  const isComplete = completed === total && total > 0
  const isLocked = todaySubmission?.locked_at != null

  const imageUrl = activeFramework.framework_template.image_path
    ? activeFramework.framework_template.image_path.startsWith('http')
      ? activeFramework.framework_template.image_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${activeFramework.framework_template.image_path}`
    : null

  if (compact) {
    return (
      <button
        onClick={onOpenChecklist}
        className="w-full text-left relative overflow-hidden rounded-[12px] h-[64px] transition-all hover:brightness-105 group"
      >
        {imageUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" />
        <div className="absolute inset-0 p-3 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[10px] text-white/60 mb-0.5">Active Framework</p>
            <p className="text-[12px] font-semibold text-white">{activeFramework.framework_template.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 max-w-[90px] h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isComplete ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-primary)]'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${isComplete ? 'text-[var(--accent-success-light)]' : 'text-white/70'}`}>
                {completed}/{total}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-white/50" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onOpenChecklist}
      className="w-full text-left relative overflow-hidden rounded-[var(--radius-section)] h-[80px] transition-all hover:brightness-105 group"
    >
      {imageUrl ? (
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url(${imageUrl})` }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 p-3 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-semibold text-white leading-tight">{activeFramework.framework_template.title}</p>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <span className="flex items-center gap-1 text-[9px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full">
                <Lock className="h-2.5 w-2.5" /> Locked
              </span>
            )}
            {isComplete && (
              <span className="pill pill--sm pill--success">Complete</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-[5px] bg-white/15 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isComplete ? 'bg-[var(--accent-success)]' : completed > 0 ? 'bg-[var(--accent-primary)]' : 'bg-white/25'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            <CheckSquare className={`h-3.5 w-3.5 ${isComplete ? 'text-[var(--accent-success-light)]' : completed > 0 ? 'text-[var(--accent-primary)]' : 'text-white/40'}`} />
            <span className={`text-[12px] font-medium ${isComplete ? 'text-[var(--accent-success-light)]' : 'text-white/80'}`}>
              {completed}/{total}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-white/45" />
        </div>
      </div>
    </button>
  )
}
