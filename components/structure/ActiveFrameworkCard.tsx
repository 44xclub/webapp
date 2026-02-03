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
      <div className="bg-surface border border-border rounded-[14px] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta text-text-muted mb-1">Active Framework</p>
            <p className="text-body font-medium text-text-primary">No framework activated</p>
          </div>
          <a href="#available-frameworks" className="text-secondary text-accent font-medium hover:underline">
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
        className="w-full text-left relative overflow-hidden rounded-[12px] h-[72px] transition-all hover:opacity-95"
      >
        {imageUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        <div className="absolute inset-0 p-3 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[11px] text-white/70 mb-0.5">Active Framework</p>
            <p className="text-[13px] font-semibold text-white">{activeFramework.framework_template.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 max-w-[100px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-accent'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={`text-[11px] font-medium ${isComplete ? 'text-emerald-400' : 'text-white/80'}`}>
                {completed}/{total}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onOpenChecklist}
      className="w-full text-left relative overflow-hidden rounded-[14px] h-[120px] transition-all hover:opacity-95"
    >
      {imageUrl ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-white/70 uppercase tracking-wide mb-1">Active Framework</p>
            <p className="text-[16px] font-semibold text-white">{activeFramework.framework_template.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="flex items-center gap-1 text-[10px] text-white/60 bg-white/10 px-2 py-1 rounded-full">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
            {isComplete && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                Complete (Today)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : completed > 0 ? 'bg-accent' : 'bg-white/30'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className={`h-4 w-4 ${isComplete ? 'text-emerald-400' : completed > 0 ? 'text-accent' : 'text-white/50'}`} />
            <span className={`text-[13px] font-medium ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
              {completed}/{total} complete
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60" />
        </div>
      </div>
    </button>
  )
}
