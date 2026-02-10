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
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[rgba(238,242,255,0.35)] uppercase tracking-wider mb-0.5">Active Framework</p>
            <p className="text-[13px] font-medium text-[rgba(238,242,255,0.70)]">No framework activated</p>
          </div>
          <a href="#available-frameworks" className="text-[12px] text-[#3b82f6] font-medium hover:underline">
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
                  className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-[#3b82f6]'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${isComplete ? 'text-emerald-400' : 'text-white/70'}`}>
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
      className="w-full text-left relative overflow-hidden rounded-[14px] h-[100px] transition-all hover:brightness-105 group"
    >
      {imageUrl ? (
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url(${imageUrl})` }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-white/55 uppercase tracking-wider mb-0.5">Active Framework</p>
            <p className="text-[15px] font-semibold text-white">{activeFramework.framework_template.title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <span className="flex items-center gap-1 text-[9px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full">
                <Lock className="h-2.5 w-2.5" /> Locked
              </span>
            )}
            {isComplete && (
              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                Complete
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : completed > 0 ? 'bg-[#3b82f6]' : 'bg-white/25'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            <CheckSquare className={`h-3.5 w-3.5 ${isComplete ? 'text-emerald-400' : completed > 0 ? 'text-[#3b82f6]' : 'text-white/40'}`} />
            <span className={`text-[12px] font-medium ${isComplete ? 'text-emerald-400' : 'text-white/80'}`}>
              {completed}/{total}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-white/45" />
        </div>
      </div>
    </button>
  )
}
